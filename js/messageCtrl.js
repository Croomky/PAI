app.controller("MessageCtrl", [ "$cookieStore", "$http", function($cookieStore, $http) {
    var ctrl = this;

    ctrl.alert = { type: "", text: "" };
    ctrl.groupsArray = [];
    
    ctrl.title = "";
    ctrl.body = "";
    ctrl.group = "";

    ctrl.getSessionIdFromCookie = function() {
        let key = 'sessionID=';
        let cookie = document.cookie;
        let semicolonIndex = cookie.indexOf(';');
        if(semicolonIndex == -1) {
            return cookie.substring(cookie.indexOf(key) + key.length, cookie.length);
        }
        return cookie.substring(cookie.indexOf(key) + key.length, cookie.indexOf(';'));
    }

    ctrl.getAvailableGroups = function() {
        $http.post('/getGroups', {
            sessionID: ctrl.getSessionIdFromCookie()
        }).then(function(res) {
            ctrl.groupsArray = res.data.groupsArray;
            //console.log(ctrl.groupsArray);
        });
    }

    ctrl.post = function() {
        if(!ctrl.validate()) {
            //ctrl.alert.text = "None of the fields can be blank.";
            return;
        }

        $http.post('/post', {
            sessionID: ctrl.getSessionIdFromCookie(),
            group: ctrl.group,
            title: ctrl.title,
            body: ctrl.body
        }).then(function(res) {
            window.open('/', '_self');
        }).catch(function(err) {
            //console.log("Couldn't send a message with error: " + err);
            ctrl.alert.text = "Couldn't send a message with error: " + err;
        });
    }

    ctrl.validate = function() {
        let isValid = true;

        if(ctrl.group == "") {
            ctrl.alert.text += "Choose a group";
            isValid = false;
        }

        if(ctrl.title == "") {
            ctrl.alert.text += "Type a title";
            isValid = false;
        }

        if(ctrl.body == "") {
            ctrl.alert.text += "Type a message";
            isValid = false;
        }

        return isValid;
    }

    ctrl.closeAlert = function() {
        ctrl.alert.text = "";
    }

    ctrl.getAvailableGroups();
}]);