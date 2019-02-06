app.controller("Ctrl2", ["$http", function($http) {

    console.log("Ctrl2 started");

    var ctrl = this;

    ctrl.alert = { text: "" };
    ctrl.persons = [];
    ctrl.person = {};

    ctrl.nSkip = 0;
    ctrl.nLimit = 15;
    ctrl.filter = "";
    ctrl.count = 0;
    ctrl.countTotal = 0;

    ctrl.refreshCount = function() {
        $http.get("/persons/?" + encodeURI(ctrl.filter)).then(
            function(rep) { ctrl.count = rep.data.count; },
            function(err) {
                ctrl.alert = { type: "warning", text: "Cannot retrieve data" };
            }
        );
        $http.get("/persons/?").then(
            function(rep) { ctrl.countTotal = rep.data.count; },
            function(err) {
                ctrl.alert = { type: "warning", text: "Cannot retrieve data" };
            }
        );
    };

    ctrl.refreshPerson = function(_id) {
        $http.get("/person/" + _id).then(
            function (rep) {
                ctrl.person = rep.data;
            },
            function (err) {
                ctrl.alert = { type: "warning", text: "Cannot retrieve data" };
                ctrl.persons = {};
            }
        );
    };

    ctrl.refreshPersons = function() {
        $http.get("/persons/" + ctrl.nSkip + "/" + ctrl.nLimit + "/" + encodeURI(ctrl.filter)).then(
            function (rep) {
                ctrl.persons = rep.data;
                ctrl.refreshCount();
            },
            function (err) {
                ctrl.alert = { type: "warning", text: "Cannot retrieve data" };
                ctrl.persons = [];
                ctrl.count = ctrl.countTotal = 0;
            }
        );
    };

    ctrl.prev = function() { ctrl.nSkip -= ctrl.nLimit; ctrl.refreshPersons(); };
    ctrl.next = function() { ctrl.nSkip += ctrl.nLimit; ctrl.refreshPersons(); };

    ctrl.edit = function(_id) {
        ctrl.person = {};
        if(_id) {
            ctrl.refreshPerson(_id);
        }
        $("#editPerson").modal();
    };

    ctrl.editSubmit = function() {
        if(ctrl.person._id) {
            /* update */
            var _id = ctrl.person._id;
            delete ctrl.person._id;
            $http.put("/person/" + _id, ctrl.person).then(
                function(rep) {
                    ctrl.person = rep.data;
                    ctrl.refreshPersons();
                    ctrl.alert = {type: "info", text: "Successfully updated"};
                },
                function(err) {
                    ctrl.alert = {type: "info", text: "Update failed"};
                }
            );
        } else {
            /* insert */
            $http.post("/addPerson", ctrl.person).then(
                function (rep) {
                    ctrl.refreshPersons();
                    ctrl.count++;
                    ctrl.alert = { type: "info", text: "Successfully added" };
                },
                function (err) {
                    ctrl.alert = { type: "warning", text: "Cannot insert data" };
                }
            );
        }
        $("#editPerson").modal("hide");
    };

    ctrl.confirmRemove = function() {
        $("#editPerson").modal("hide");
        ctrl.confirm = { text: "Are you sure to delete '" + ctrl.person.firstName + " " + ctrl.person.lastName + "'", action: function() {
                /* delete */
                $("#confirmDialog").modal("hide");
                $http.delete("/person/" + ctrl.person._id).then(
                    function(rep) {
                        ctrl.count--;
                        if(ctrl.nSkip >= ctrl.count && ctrl.count > 0) {
                            ctrl.nSkip -= ctrl.nLimit;
                            if(ctrl.nSkip < 0) ctrl.nSkip = 0;
                        }
                        ctrl.refreshPersons();
                        ctrl.alert = { type: "info", text: "Successfully deleted" };
                    },
                    function(err) {
                        ctrl.alert = { type: "warning", text: "Delete failed" };
                    }
                );
            }
        };
        $("#confirmDialog").modal();
    };

    ctrl.closeAlert = function() {
        ctrl.alert = { text: "" };
    };

    ctrl.refreshPersons();

}]);