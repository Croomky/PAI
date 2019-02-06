app.controller("GroupsCtrl", [ "$cookieStore", "$http", function($cookieStore, $http) {
    var ctrl = this;
    
    ctrl.alert = { type: "", text: "" };
    ctrl.groupsNames = [];
    ctrl.notEnrolledGroups = [];
    ctrl.enrolledGroups = [];

    function getDifference(names, groups) {
        var differenceArray = [];

        groups.forEach(i => {
            if(names.indexOf(i.name) == -1) {
                differenceArray.push(i);
            }
        });

        return differenceArray;
    }

    ctrl.getGroups = function() {
        $http.post('/getGroups', {
            sessionID: ctrl.getSessionIdFromCookie()
        }).then(function(res) {
            //console.log(res.data.groupsArray);
            ctrl.enrolledGroups = res.data.groupsArray;
            $http.get('/groups/list').then(function(r) {
                //console.log(r.data.docs);
                ctrl.notEnrolledGroups = getDifference(ctrl.enrolledGroups, r.data.docs);
            }).catch(function(err) {
                ctrl.alert.text = "Couldn't get list of groups";
            });
            return ctrl.enrolledGroups;
        }).catch(function(err) {
            //console.log(err);
            ctrl.alert.text = "Couldn't get list of groups";
            return [];
        });
    }

    // ctrl.next = function() {
    //     return;
    // }

    ctrl.closeAlert = function() {
        ctrl.alert.text = "";
    }

    ctrl.getSessionIdFromCookie = function() {
        let key = 'sessionID=';
        let cookie = document.cookie;
        let semicolonIndex = cookie.indexOf(';');
        if(semicolonIndex == -1) {
            return cookie.substring(cookie.indexOf(key) + key.length, cookie.length);
        }
        return cookie.substring(cookie.indexOf(key) + key.length, cookie.indexOf(';'));
    }

    ctrl.groupEnrollment = function(name) {
        //console.log(ctrl.getSessionIdFromCookie());
        $http.post('/enrollment', {
            sessionID: ctrl.getSessionIdFromCookie(),
            groupName: name
        }).then(function(res) {
            console.log("asdasd");
            location.reload();
        });
    }
    
    ctrl.getGroups();
}]);