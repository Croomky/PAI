app.controller("LoginCtrl", [ "$cookieStore", "$http", function($cookieStore, $http) {

    var ctrl = this;
    ctrl.username = "";
    ctrl.password = "";
    ctrl.alert = { type: '', text: ''}

    // ctrl.setCookie = function (key,value) {
    //     var cookieDate = new Date(2010,11,10,19,30,30);
    //     document.cookie=key + "=" + encodeURI(value) + "; expires=" +
    //     cookieDate.toGMTString() + "; path=/";
    // }

    ctrl.login = function() {
        $http.post('/login', {
            login: ctrl.username,
            password: ctrl.password
        }).then(function(res) {
            if(res.data.answer == true) {
                // document.cookie = "sessionID=" + res.data.cookie;
                console.log("server's cookie: " + res.data.cookie);
                //$cookieStore.put("sessionID", res.data.cookie, { path: '/' });
                //ctrl.setCookie("sessionID", res.data.cookie);
                document.cookie = "sessionID=" + res.data.cookie + "; Path=/;";
                window.open('/', '_self');
            } else {
                console.log("invalid credentials");
                ctrl.alert.text = "Invalid credentials";
            }
        });
    }

    ctrl.closeAlert = function() {
        ctrl.alert.text = "";
    }
}]);