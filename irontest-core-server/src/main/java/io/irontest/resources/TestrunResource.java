package io.irontest.resources;

import io.irontest.core.assertion.AssertionVerifier;
import io.irontest.core.assertion.AssertionVerifierFactory;
import io.irontest.core.runner.SOAPTeststepRunResult;
import io.irontest.core.runner.TeststepRunnerFactory;
import io.irontest.db.TeststepDAO;
import io.irontest.db.UtilsDAO;
import io.irontest.models.Endpoint;
import io.irontest.models.MQTeststepProperties;
import io.irontest.models.Testrun;
import io.irontest.models.Teststep;
import io.irontest.models.assertion.Assertion;
import io.irontest.models.assertion.AssertionVerification;
import io.irontest.models.assertion.AssertionVerificationResult;
import io.irontest.utils.XMLUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import java.util.List;

/**
 * Created by Trevor Li on 24/07/2015.
 */
@Path("/testruns") @Produces({ MediaType.APPLICATION_JSON })
public class TestrunResource {
    private static final Logger LOGGER = LoggerFactory.getLogger(TestrunResource.class);
    private final TeststepDAO teststepDAO;
    private final UtilsDAO utilsDAO;

    public TestrunResource(TeststepDAO teststepDAO, UtilsDAO utilsDAO) {
        this.teststepDAO = teststepDAO;
        this.utilsDAO = utilsDAO;
    }

    private Object runTeststep(Teststep teststep) throws Exception {
        prepareTeststepForRun(teststep);
        Object result = TeststepRunnerFactory.getInstance().getTeststepRunner(teststep.getType() + "TeststepRunner")
                .run(teststep);
        LOGGER.info(result == null ? null : result.toString());
        return result;
    }

    private void prepareTeststepForRun(Teststep teststep) {
        //  decrypt password in endpoint
        Endpoint endpoint = teststep.getEndpoint();
        if (endpoint != null && endpoint.getPassword() != null) {
            endpoint.setPassword(utilsDAO.decryptPassword(endpoint.getPassword()));
        }

        //  fetch request for MQ test step Enqueue action with message from file
        if (Teststep.TYPE_MQ.equals(teststep.getType()) && Teststep.ACTION_ENQUEUE.equals(teststep.getAction())) {
            MQTeststepProperties properties = (MQTeststepProperties) teststep.getOtherProperties();
            if (MQTeststepProperties.ENQUEUE_MESSAGE_FROM_FILE.equals(properties.getEnqueueMessageFrom())) {
                teststep.setRequest(teststepDAO.getBinaryRequestById(teststep.getId()));
            }
        }
    }

    @POST
    public Testrun create(Testrun testrun) throws Exception {
        if (testrun.getTeststep() != null) {
            Thread.sleep(100); // workaround for Chrome 44 to 48's 'Failed to load response data' problem (no such problem in Chrome 49)
            LOGGER.info("Running an individual test step.");
            Object result = runTeststep(testrun.getTeststep());

            if (Teststep.TYPE_SOAP.equals(testrun.getTeststep().getType())) {
                //  for better display in browser, transform XML response to be pretty-printed
                SOAPTeststepRunResult runResult = (SOAPTeststepRunResult) result;
                if (MediaType.TEXT_XML_TYPE.isCompatible(MediaType.valueOf(runResult.getResponseContentType()))) {
                    runResult.setResponseBody(XMLUtils.prettyPrintXML(runResult.getResponseBody()));
                }
            }

            testrun.setResponse(result);
            testrun.setTeststep(null);    //  no need to pass the test step back to client which might contain decrypted password
        } else if (testrun.getTestcaseId() != null) {  //  run a test case (not passing invocation responses back to client)
            LOGGER.info("Running a test case.");
            List<Teststep> teststeps = teststepDAO.findByTestcaseId(testrun.getTestcaseId());

            for (Teststep teststep : teststeps) {
                //  run and get response
                Object result = runTeststep(teststep);

                //  verify assertions against the invocation response
                for (Assertion assertion : teststep.getAssertions()) {
                    AssertionVerification verification = new AssertionVerification();
                    verification.setAssertion(assertion);
                    verification.setInput(result);
                    AssertionVerifier verifier = new AssertionVerifierFactory().create(assertion.getType());
                    AssertionVerificationResult verificationResult = verifier.verify(verification);
                    if (Boolean.FALSE == verificationResult.getPassed()) {
                        testrun.getFailedTeststepIds().add(teststep.getId());
                        break;
                    }
                }
            }
        }

        return testrun;
    }

    @DELETE @Path("{testrunId}")
    public void delete(@PathParam("testrunId") long testrunId) {
    }

    @GET
    public List<Testrun> findAll() {
        return null;
    }

    @GET @Path("{testrunId}")
    public Testrun findById(@PathParam("testrunId") long testrunId) {
        return null;
    }
}