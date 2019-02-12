app.controller("IndexCtrl", [ "$cookieStore", "$http", function($cookieStore, $http) {
    var ctrl = this;

    ctrl.nSkip = 0;
    //ctrl.maxIndexOnPage = 5;
    //ctrl.filter = "";
    ctrl.pageLimit = 5;
    ctrl.countTotal = 0;
    ctrl.messagesArray = [];
    ctrl.isAuthenticated = false;

    ctrl.getMessages = function() {
        $http.post('/getMessages/' + ctrl.nSkip + '/' + ctrl.pageLimit, {
            sessionID: ctrl.getSessionIdFromCookie()
        }).then(function(res) {
            ctrl.messagesArray = res.data;
            ctrl.count = ctrl.messagesArray.length;
            //console.log(ctrl.messagesArray);
        }).catch(function(err) {
            console.log("Couldn't get messages with error: " + err.status);
        });
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

    ctrl.authenticate = function() {
        return new Promise(function(resolve, reject) {
            var sessionID = ctrl.getSessionIdFromCookie();
            //console.log("sessionID: " + sessionID);

            $http.post('/authenticate', {
                sessionID: sessionID
            }).then(function(res) {
                //console.log(res.data.answer);
                if(res.data.answer == true) {
                    ctrl.isAuthenticated = true;
                }
                resolve();
            });
        });
    }

    ctrl.getNumberOfMessages = function() {
        let sessionID = ctrl.getSessionIdFromCookie();
        //console.log(sessionID);
        $http.post('/getNumberOfMessages', {
            sessionID: sessionID
        }).then(function(res) {
            ctrl.countTotal = res.data.answer;
        }).catch(function(err) {
            console.log(err);
        });
    }

    ctrl.next = function() {
        ctrl.nSkip += 5;
        ctrl.nLimit += 5;
        ctrl.getMessages();
    }

    ctrl.prev = function() {
        ctrl.nSkip -= 5;
        ctrl.nLimit -= 5;
        ctrl.getMessages();
    }

    ctrl.logOut = function() {
        console.log("sessionID: " + ctrl.getSessionIdFromCookie())
        $http.post('/logOut', {
            sessionID: ctrl.getSessionIdFromCookie()
        }).then(function(res) {
            $cookieStore.remove('sessionID');
            window.open('/', '_self');
        }).catch(function(err) {
            console.log("Couldn't log out with error: " + err);
        });
    }

    ctrl.authenticate().then(function(res) {
        if(ctrl.isAuthenticated) {
            ctrl.getNumberOfMessages();
            ctrl.getMessages();
        }
    });
    
}]);