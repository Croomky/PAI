app.controller("Ctrl1", [ "$http", function($http) {

    console.log("Ctrl1 started");

    var ctrl = this;

    ctrl.alert = { text: "" };
    ctrl.person = {};
    ctrl.personToEdit = {};
    ctrl.transfer = { "amount": 0 };
    ctrl.personsList = [];

    $http.get("/persons").then(
        function(rep) {
            ctrl.personsList = rep.data;
            ctrl.person = ctrl.personsList[0];
            ctrl.selectChanged();
        },
        function(err) {
            ctrl.alert = { type: "warning", text: "Cannot retrieve data" };
        }
    );

    ctrl.getPerson = function() {
        $http.get("/person/" + ctrl.person._id).then(
            function(rep) {
                ctrl.personToEdit = rep.data;
            },
            function(err) {
                ctrl.alert = { type: "warning", text: "Cannot retrieve data" };
            }
        );
    };

    ctrl.doTransfer = function() {
        $http.post("/transfer/" + ctrl.person._id, ctrl.transfer).then(
            function(rep) {
                ctrl.personToEdit = rep.data;
                ctrl.transfer.amount = 0;
                ctrl.alert = { type: "info", text: "Transfer successful" };
            },
            function(err) {
                ctrl.alert = { type: "warning", text: "Transfer failed" };
            }
        );
    };

    ctrl.selectChanged = function() {
        ctrl.getPerson();
    };

    ctrl.closeAlert = function() {
        ctrl.alert = { text: "" };
    };

}]);