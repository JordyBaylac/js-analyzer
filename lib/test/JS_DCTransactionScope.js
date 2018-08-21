
function NestPay_CCValidation() {

}

NestPay_CCValidation.prototype.sendRequest = function (request) {
    this.httpClient.Trace = this.tctrace;
}
