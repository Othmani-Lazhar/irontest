package io.irontest.resources;

import com.fasterxml.jackson.core.JsonProcessingException;
import io.irontest.core.assertion.AssertionVerifier;
import io.irontest.core.assertion.AssertionVerifierFactory;
import io.irontest.core.runner.MQAPIResponse;
import io.irontest.core.runner.SOAPAPIResponse;
import io.irontest.core.runner.TeststepRunnerFactory;
import io.irontest.db.TestcaseDAO;
import io.irontest.db.TestcaseRunDAO;
import io.irontest.db.TeststepDAO;
import io.irontest.db.UtilsDAO;
import io.irontest.models.*;
import io.irontest.models.assertion.Assertion;
import io.irontest.models.assertion.AssertionVerificationResult;
import io.irontest.views.TestcaseRunView;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Created by Trevor Li on 24/07/2015.
 */
@Path("/testcaseruns") @Produces({ MediaType.APPLICATION_JSON })
public class TestcaseRunResource {
    private static final Logger LOGGER = LoggerFactory.getLogger(TestcaseRunResource.class);
    private final TestcaseDAO testcaseDAO;
    private final TeststepDAO teststepDAO;
    private final UtilsDAO utilsDAO;
    private final TestcaseRunDAO testcaseRunDAO;

    public TestcaseRunResource(TestcaseDAO testcaseDAO, TeststepDAO teststepDAO, UtilsDAO utilsDAO,
                               TestcaseRunDAO testcaseRunDAO) {
        this.testcaseDAO = testcaseDAO;
        this.teststepDAO = teststepDAO;
        this.utilsDAO = utilsDAO;
        this.testcaseRunDAO = testcaseRunDAO;
    }

    @POST
    public TestcaseRun create(TestcaseRun testcaseRun) throws JsonProcessingException {
        Testcase testcase = testcaseDAO.findById_Complete(testcaseRun.getTestcase().getId());
        testcaseRun.setTestcase(testcase);

        //  test case run starts
        testcaseRun.setResult(TestResult.PASSED);
        testcaseRun.setStartTime(new Date());

        for (Teststep teststep : testcase.getTeststeps()) {
            TeststepRun stepRun = new TeststepRun();
            testcaseRun.getStepRuns().add(stepRun);
            stepRun.setTeststep(teststep);

            //  test step run starts
            stepRun.setStartTime(new Date());

            //  run test step and get API response
            Object apiResponse = null;
            boolean exceptionOccurred = false;  //  use this flag as exception message could be null (though rarely)
            try {
                apiResponse = TeststepRunnerFactory.getInstance()
                        .newTeststepRunner(teststep, teststepDAO, utilsDAO).run();
                stepRun.setResponse(apiResponse);
            } catch (Exception e) {
                exceptionOccurred = true;
                String message = e.getMessage();
                stepRun.setErrorMessage(message);
                LOGGER.error(message, e);
            }
            LOGGER.info(apiResponse == null ? null : apiResponse.toString());

            //  verify assertions
            if (exceptionOccurred) {
                stepRun.setResult(TestResult.FAILED);
            } else {
                stepRun.setResult(TestResult.PASSED);

                //  get input for assertion verifications
                Object assertionVerificationInput = null;
                if (Teststep.TYPE_SOAP.equals(teststep.getType())) {
                    assertionVerificationInput = ((SOAPAPIResponse) apiResponse).getHttpResponseBody();
                } else if (Teststep.TYPE_MQ.equals(teststep.getType())) {
                    assertionVerificationInput = ((MQAPIResponse) apiResponse).getValue();
                } else {
                    assertionVerificationInput = apiResponse;
                }

                //  verify assertions against the input
                for (Assertion assertion : teststep.getAssertions()) {
                    AssertionVerification verification = new AssertionVerification();
                    stepRun.getAssertionVerifications().add(verification);
                    verification.setAssertion(assertion);

                    AssertionVerifier verifier = new AssertionVerifierFactory().create(assertion.getType());
                    AssertionVerificationResult verificationResult = verifier.verify(assertion, assertionVerificationInput);

                    verification.setVerificationResult(verificationResult);

                    if (TestResult.FAILED == verificationResult.getResult()) {
                        stepRun.setResult(TestResult.FAILED);
                    }
                }
            }

            //  test step run ends
            stepRun.setDuration(new Date().getTime() - stepRun.getStartTime().getTime());
            if (TestResult.FAILED == stepRun.getResult()) {
                testcaseRun.setResult(TestResult.FAILED);
            }
        }

        //  test case run ends
        testcaseRun.setDuration(new Date().getTime() - testcaseRun.getStartTime().getTime());

        //  persist test case run details into database
        testcaseRunDAO.insert(testcaseRun);

        //  prepare return object for UI (reduced contents for performance)
        testcaseRun.setTestcase(null);
        List<Long> failedTeststepIds = new ArrayList<Long>();
        for (TeststepRun stepRun : testcaseRun.getStepRuns()) {
            if (TestResult.FAILED == stepRun.getResult()) {
                failedTeststepIds.add(stepRun.getTeststep().getId());
            }
        }
        testcaseRun.setFailedTeststepIds(failedTeststepIds);
        testcaseRun.getStepRuns().clear();
        return testcaseRun;
    }

    @GET @Path("{testcaseRunId}/htmlreport") @Produces(MediaType.TEXT_HTML)
    public TestcaseRunView getHTMLReportByTestcaseRunId(@PathParam("testcaseRunId") long testcaseRunId) {
        TestcaseRun testcaseRun = testcaseRunDAO.findById(testcaseRunId);
        return new TestcaseRunView(testcaseRun);
    }
}