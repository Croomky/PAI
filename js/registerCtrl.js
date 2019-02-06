app.controller("RegisterCtrl", [ "$cookieStore", "$http", function($cookieStore, $http) {

    var ctrl = this;
    ctrl.username = "";
    ctrl.password = "";
    ctrl.password2 = "";
    ctrl.usernameAvailable = false;

    ctrl.alert = { text: "" };

    ctrl.register = function() {
        if(ctrl.password != ctrl.password2) {
            ctrl.alert.text = "Password confirmation doesn't fit the password.";
            return;
        }
        if(ctrl.checkForEmptyFields()) {
            return;
        }
        ctrl.isUsernameAvailable(ctrl.username).then(function(res) {
            if(res == false) {
                ctrl.alert.text = "This username is already taken.";
                return;
            }

            $http.post("/addPerson", {
                login: ctrl.username,
                password: ctrl.password
            }).then(function(res) {
                window.open('/', '_self');
            }).catch(function(err) {
                ctrl.alert.text = "Failed to add new user.";
            });
        });
    }

    ctrl.closeAlert = function() {
        ctrl.alert = { text: "" };
    };

    ctrl.isUsernameAvailable = function(username) {
        return new Promise(function(resolve, reject) {
            $http.get('/username/' + username).then(function(res) {
                console.log("res.data.answer: " + res.data.answer);
                console.log(typeof res.data.answer);
                if(res.data.answer == "true") {
                    resolve(true);
                } else {
                    resolve(false);
                }
            })
        });
    }

    ctrl.checkForEmptyFields = function() {
        let foundEmpty = false;
        if(ctrl.username == "") {
            ctrl.alert.text += "\nUsername cannot be empty";
            foundEmpty = true;
        }
        if(ctrl.password == "") {
            ctrl.alert.text += "\nPassword cannot be empty";
            foundEmpty = true;
        }

        return foundEmpty;
    }

}]);