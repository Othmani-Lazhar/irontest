package io.irontest.models.assertion;

/**
 * Created by Zheng on 25/07/2016.
 */
public class AssertionVerification {
    private Assertion assertion;
    private AssertionVerificationResult verificationResult;

    public Assertion getAssertion() {
        return assertion;
    }

    public void setAssertion(Assertion assertion) {
        this.assertion = assertion;
    }

    public AssertionVerificationResult getVerificationResult() {
        return verificationResult;
    }

    public void setVerificationResult(AssertionVerificationResult verificationResult) {
        this.verificationResult = verificationResult;
    }
}
