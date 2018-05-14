/**
 * Created by nmasuki on 11/1/2017.
 */
var produrl = "https://sandbox.safaricom.co.ke";
var sandbox = "https://sandbox.safaricom.co.ke";
module.exports = {
    env: "sandbox",
    production: {
        reversal_request: `${produrl}/mpesa/reversal/v1/request`,
        b2c_payment_request: `${produrl}/mpesa/b2c/v1/paymentrequest`,
        b2b_payment_request: `${produrl}/mpesa/b2b/v1/paymentrequest`,
        c2b_register_url: `${produrl}/mpesa/c2b/v1/registerurl`,
        c2b_simulate_transaction: `${produrl}/mpesa/c2b/v1/simulate`,
        transaction_status_request: `${produrl}/mpesa/transactionstatus/v1/query`,
        account_balance_request: `${produrl}/mpesa/accountbalance/v1/query`,
        lipa_na_mpesa_online_query: `${produrl}/mpesa/stkpushquery/v1/query`,
        lipa_na_mpesa_online_payment: `${produrl}/mpesa/stkpush/v1/processrequest`,
        oauth_generate_token: `${produrl}/oauth/v1/generate`
    },
    sandbox: {
        reversal_request: `${sandbox}/mpesa/reversal/v1/request`,
        b2c_payment_request: `${sandbox}/mpesa/b2c/v1/paymentrequest`,
        b2b_payment_request: `${sandbox}/mpesa/b2b/v1/paymentrequest`,
        c2b_register_url: `${sandbox}/mpesa/c2b/v1/registerurl`,
        c2b_simulate_transaction: `${sandbox}/mpesa/c2b/v1/simulate`,
        transaction_status_request: `${sandbox}/mpesa/transactionstatus/v1/query`,
        account_balance_request: `${sandbox}/mpesa/accountbalance/v1/query`,
        lipa_na_mpesa_online_query: `${sandbox}/mpesa/stkpushquery/v1/query`,
        lipa_na_mpesa_online_payment: `${sandbox}/mpesa/stkpush/v1/processrequest`,
        oauth_generate_token: `${sandbox}/oauth/v1/generate`
    }
}
