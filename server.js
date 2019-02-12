var fs = require('fs');
var http = require('http');
var path = require('path');
var mime = require('mime');
var mongodb = require("mongodb");
var md5 = require('blueimp-md5');

var mongo = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId;

var debugLog = true; // turning on logging to the console
var sessionsArray = [];
// sessionsArray.push({
//     sessionID: '098f6bcd4621d373cade4e832627b4f6',
//     username: 'test'
// });

const listeningPort = 8888;
const dbUrl = "mongodb://localhost:27017";
//const dbUrl = "mongodb+srv://Cluster0_rw:Cluster0_rw@cluster0-hzyea.mongodb.net/admin?retryWrites=true";
const dbName = "PAI_Konrad_Pawlak";

var server = null;
var db = null;
var persons = null;
var groups = null;
var messages = null;

mongo.connect(dbUrl, { useNewUrlParser: true }, function(err, conn) {
	
	if(err) {
        console.log("Connection to database failed");
        process.exit();
	}

    console.log("Connection to database established");
	
	db = conn.db(dbName);
	// db.dropDatabase(); // uncomment to clear database
    persons = db.collection("persons");
    groups = db.collection("groups");
    messages = db.collection("messages");

    groups.findOne({
        name: "test group"
    }).then(function (doc) {
        if(doc == null) {
            groups.insertOne({
                name: 'test group',
                users: ["test"]
            });
        }
    })

    groups.findOne({
        name: "test group2"
    }).then(function (doc) {
        if(doc == null) {
            groups.insertOne({
                name: 'test group2',
                users: ["test"]
            });
        }
    })
    
    messages.find().count(function(err, n) {
        if(n == 0) {
            try {
                var messagesFile = JSON.parse(fs.readFileSync("messages.json", 'utf8'));
                messages.insertMany(messagesFile, function(err) {
                    persons.findOne({
                        login: 'test'
                    }).then(function(doc) {
                        if(doc == null) {
                            try {
                                messages.find({}, {
                                    projection: {
                                        _id: 1
                                    }
                                }).toArray(function(err, docs) {
                                    messagesArray = []
                                    docs.forEach(doc => {
                                        messagesArray.push(doc._id);
                                    });
                
                                    persons.insertOne({
                                        login: 'test',
                                        password: md5('qwe'),
                                        messages: messagesArray
                                    });
                                })
                            } catch(ex) {
                                console.log("Error during initialization");
                                process.exit();
                            }
                        }
                    }).catch(function(err) {
                        console.log("Error: " + err);
                    })
                });
            } catch(ex) {
                console.log("Error during initialization");
                process.exit();
            }
        }
    });
	
	try {
		server.listen(listeningPort);
	} catch(ex) {
		console.log("Port " + listeningPort + " cannot be used");
		process.exit();
	}
	console.log("HTTP server is listening on the port " + listeningPort);
});


function serveFile(rep, fileName, errorCode, message) {
	
	if(debugLog) console.log('Serving file ' + fileName + (message ? ' with message \'' + message + '\'': ''));
	
    fs.readFile(fileName, function(err, data) {
		if(err) {
            serveError(rep, 404, 'Document ' + fileName + ' not found');
        } else {
			rep.writeHead(errorCode, message, { 'Content-Type': mime.getType(path.basename(fileName)) });
			if(message) {
				data = data.toString().replace('{errMsg}', rep.statusMessage).replace('{errCode}', rep.statusCode);
			}
			rep.end(data);
        }
      });
}

function serveError(rep, error, message) {
	serveFile(rep, 'html/error.html', error, message);
}

function serveErrorJson(rep, error, message) {
	rep.writeHead(error, { "contentType": "application/json" });
	rep.write(JSON.stringify({ "error": message }));
	rep.end();
}

function saveSessionCookie(username) {
    hash = md5(username);
    sessionsArray.push({
        sessionID: hash,
        username: username
    });

    return hash;
}

function getUsernameBySessionID(sessionID) {
    let username;
    sessionsArray.forEach(element => {
        if(element.sessionID == sessionID) {
            username = element.username;
            return;
        }
    });
    return username;
}

function isUserEnrolledToGroup(groupName, username) {
    return new Promise(function(resolve, reject) {
        groups.findOne({ name: groupName }).then(function(doc) {
            if(!doc) {
                console.log("Couldn't find " + groupName);
                reject();
            } else {
                doc.users.forEach(element => {
                    if(element == username) {
                        resolve(true);
                    }
                });
                resolve(false);
            }
        });
    });
}

server = http.createServer().on('request', function (req, rep) {
	
	if(debugLog) console.log('HTTP request: ' + req.method + " " + req.url);
	
	switch(req.url) {
        case '/':
            serveFile(rep, 'html/index.html', 200, '');
            break;
        case '/favicon.ico':
            serveFile(rep, 'img/favicon.ico', 200, '');
            break;
        case '/addPerson':
            switch (req.method) {
                case "POST":
                    var content = "";
                    req.setEncoding("utf8");
                    req.on("data", function (data) {
                        content += data;
                    }).on("end", function () {
                        var obj = {};
                        try {
                            obj = JSON.parse(content);
                            persons.insertOne({
                                login: obj.login,
                                password: md5(obj.password),
                                messages: []
                            }, function (err, insResult) {
                                if (err) {
                                    serverErrorJson(rep, 406, "Insert failed");
                                    return;
                                }
                                rep.writeHead(200, {"Content-type": "application/json"});
                                rep.end(JSON.stringify(insResult.ops[0]));
                            });
                        } catch (ex) {
                            serveErrorJson(rep, 406, "Invalid JSON");
                            return;
                        }
                    });
                    break;
                default:
                    serveErrorJson(rep, 405, "Method " + req.method + " not allowed");
            }
            break;
        case '/login':
            if(req.method == 'POST') {
                var content = "";
                req.setEncoding("utf8");
                req.on("data", function (data) {
                    content += data;
                }).on("end", function () {
                    var obj = {};
                    try {
                        obj = JSON.parse(content);
                        persons.findOne({
                            login: obj.login,
                            password: md5(obj.password)
                        }, function (err, doc) {
                            if (err) {
                                serverErrorJson(rep, 406, "Find failed");
                                return;
                            }
                            rep.writeHead(200, {"Content-type": "application/json"});
                            if(doc) {
                                rep.end(JSON.stringify({
                                    answer: true,
                                    cookie: saveSessionCookie(doc.login)
                                    }));
                            } else {
                                rep.end(JSON.stringify({answer: false}));
                            }
                        });
                    } catch (ex) {
                        serveErrorJson(rep, 406, "Invalid JSON");
                        return;
                    }
                });
            } else {
                serveErrorJson(rep, 405, "Method " + req.method + " not allowed");
            }
            break;
        case '/authenticate':
            if(req.method == 'POST') {
                var content = "";
                req.setEncoding("utf8");
                req.on("data", function (data) {
                    content += data;
                }).on("end", function () {
                    var obj = {};
                    try {
                        obj = JSON.parse(content);
                        var found = false;
                        rep.writeHead(200, {"Content-type": "application/json"});
                        sessionsArray.forEach(element => {
                            if(element.sessionID == obj.sessionID) {
                                found = true;
                                return;
                            }
                        });
                        if(found) {
                            rep.end(JSON.stringify({answer: true}));
                        } else {
                            rep.end(JSON.stringify({answer: false}));
                        }
                    } catch (ex) {
                        serveErrorJson(rep, 406, "Invalid JSON");
                        return;
                    }
                });
            } else {
                serveErrorJson(rep, 405, "Method " + req.method + " not allowed");
            }
            break;
        case '/groups/list':
            var groupsArray = [];
            groups.find({}, {
                projection: {
                    name: 1
                }
            }).toArray(function(err, docs) {
                if(err) {
                    serveErrorJson(rep, 406, "Invalid JSON");
                }
                rep.writeHead(200, {"Content-type": "application/json"});
                rep.end(JSON.stringify({docs}));
                return;
            });
            break;
        case '/enrollment':
            if(req.method == "POST") {
                var content = "";
                req.setEncoding("utf8");
                req.on("data", function (data) {
                    content += data;
                }).on("end", function () {
                    var obj = {};
                    try {
                        obj = JSON.parse(content);
                        let username = getUsernameBySessionID(obj.sessionID);
                        isUserEnrolledToGroup(obj.groupName, username).then(function(res) {
                            if(res) {
                                groups.findOneAndUpdate({ name: obj.groupName }, { $pull: { users: username }});
                            } else {
                                groups.findOneAndUpdate({ name: obj.groupName }, { $push: { users: username }});
                            }
                        }).catch(function(res) {
                            console.log(res);
                        });
                        rep.writeHead(200, {"Content-type": "application/json"});
                        rep.end();
                    } catch (ex) {
                        serveErrorJson(rep, 406, "Invalid JSON");
                        return;
                    }
                });
            } else {
                serveErrorJson(rep, 405, "Method " + req.method + " not allowed");
            }
            break;
        case '/getGroups':
            if(req.method == "POST") {
                var content = "";
                req.setEncoding("utf8");
                req.on("data", function (data) {
                    content += data;
                }).on("end", function () {
                    var obj = {};
                    try {
                        obj = JSON.parse(content);
                        let username = getUsernameBySessionID(obj.sessionID);
                        groups.find().toArray(function(err, docs) {
                            if(err) {
                                serveErrorJson(rep, 406, "Invalid JSON");
                            }

                            var groupsArray = [];
                            docs.forEach(group => {
                                group.users.forEach(user => {
                                    if(user == username) {
                                        groupsArray.push(group.name);
                                    }
                                });
                            });
                            
                            rep.writeHead(200, {"Content-type": "application/json"});
                            rep.end(JSON.stringify({ groupsArray }));
                        });
                    } catch (ex) {
                        serveErrorJson(rep, 406, "Invalid JSON");
                        return;
                    }
                });
            } else {
                serveErrorJson(rep, 405, "Method " + req.method + " not allowed");
            }
            break;
        case '/post':
            if(req.method == "POST") {
                var content = "";
                req.setEncoding("utf8");
                req.on("data", function (data) {
                    content += data;
                }).on("end", function () {
                    var obj = {};
                    try {
                        obj = JSON.parse(content);
                        let username = getUsernameBySessionID(obj.sessionID);
                        messages.insertOne({
                            title: obj.title,
                            author: username,
                            body: obj.body,
                            group: obj.group
                        }).then(function(res) {
                            messages.findOne({
                                title: obj.title,
                                body: obj.body,
                                author: username
                            }).then(function(message) {
                                groups.findOne({
                                    name: obj.group
                                }).then(function(docs) {
                                    docs.users.forEach(user => {
                                        persons.findOneAndUpdate({
                                            login: user
                                        }, { $push: { messages: message._id }});
                                    });
                                    
                                    rep.writeHead(200, { "Content-type": "application/json" });
                                    rep.end(JSON.stringify({ answer: true }));
                                }).catch(function(err) {
                                    console.log("Couldn't post a message with error: " + err);
                                });
                            }).catch(function(err) {
                                console.log("Couldn't post a message with error: " + err);
                            });
                        }).catch(function(err) {
                            console.log("Couldn't post a message with error: " + err);
                        });
                    } catch (ex) {
                        serveErrorJson(rep, 406, "Invalid JSON");
                        return;
                    }
                });
            } else {
                serveErrorJson(rep, 405, "Method " + req.method + " not allowed");
            }
            break;
        case '/getNumberOfMessages':
            if(req.method != "POST") {
                serveErrorJson(rep, 405, "Method " + req.method + " not allowed");
            }

            var content = "";
            req.setEncoding("utf8");
            req.on("data", function (data) {
                content += data;
            }).on("end", function () {
                var obj = {};
                try {
                    obj = JSON.parse(content);
                    let username = getUsernameBySessionID(obj.sessionID);

                    persons.findOne({
                        login: username
                    }).then(function(res) {
                        rep.writeHead(200, {"Content-type": "application/json"});
                        rep.end(JSON.stringify({ answer: res.messages.length }));
                    }).catch(function(err) {
                        serveErrorJson(rep, 405, "Cannot count messages");
                    });
                } catch (ex) {
                    serveErrorJson(rep, 406, "Invalid JSON");
                    return;
                }
            });
            break;
        case '/logOut':
            if(req.method != "POST") {
                serveErrorJson(rep, 405, "Method " + req.method + " not allowed");
            }

            var content = "";
            req.setEncoding("utf8");
            req.on("data", function (data) {
                content += data;
            }).on("end", function () {
                var obj = {};
                try {
                    obj = JSON.parse(content);
                    console.log("obj:" + obj)
                    let i = sessionsArray.indexOf({
                        sessionID: obj.sessionID,
                        username: getUsernameBySessionID(obj.sessionID)
                    });

                    sessionsArray.splice(i, 1);
                    rep.writeHead(200, {"Content-type": "application/json"});
                    rep.end();
                } catch (ex) {
                    console.log("ex: " + ex)
                    serveErrorJson(rep, 406, "Invalid JSON");
                    return;
                }
            });
            break;
        default:
            if (/^\/(html|css|js|fonts|img)\//.test(req.url)) {

                var fileName = path.normalize('./' + req.url)
                serveFile(rep, fileName, 200, '');

            } else if (/^\/persons\//.test(req.url)) {

                var a = req.url.split("/");

                if (a[2].charAt(0) == "?") {
                    var query = {};
                    var pattern = decodeURI(a[2].slice(1));
                    if(pattern.length > 0) {
                        query = { $where: "(this.firstName + ' ' + this.lastName).match(/" + pattern + "/i)" };
                    }
                    persons.find(query).count(function (err, n) {
                        if(err) {
                            serveErrorJson(rep, 405, "Cannot count persons");
                            return;
                        }
                        rep.writeHead(200, {"Content-type": "application/json"});
                        rep.end(JSON.stringify({count: n}));
                    });
                    return;
                }

                var nSkip = 0;
                var nLimit = 0;
                if (a.length > 3) {
                    try {
                        nSkip = parseInt(a[2]);
                        nLimit = parseInt(a[3]);
                    } catch (ex) {
                        serveErrorJson(rep, 405, "Invalid parameters for /persons");
                        return;
                    }
                }

                var query = {};
                if(a.length > 4 && a[4].length > 0) {
                    query = { $where: "(this.firstName + ' ' + this.lastName).match(/" + decodeURI(a[4]) + "/i)" };
                }

                persons.find(query).collation({ locale: "pl" }).sort({ lastName: +1, firstName: +1 }).skip(nSkip).limit(nLimit).toArray(function (err, docs) {
                    if (err) {
                        serveErrorJson(rep, 404, "Persons not found");
                        return;
                    }
                    rep.writeHead(200, {"Content-type": "application/json"});
                    rep.write(JSON.stringify(docs));
                    rep.end();
                })
                break;

            } else if(/\/username\//.test(req.url)) {
                let username = req.url.split('/')[2];
                persons.findOne({ login: username }, function(err, doc) {
                    if(doc) {
                        rep.writeHead(200, {"Content-type": "application/json"});
                        rep.end(JSON.stringify({ "answer": "false"}));
                    } else {
                        rep.writeHead(200, {"Content-type": "application/json"});
                        rep.end(JSON.stringify({ "answer": "true"}));
                    }
                });
            } else if(/\/getMessages\//.test(req.url)) {
                if(req.method != "POST") {
                    serveErrorJson(rep, 405, "Method " + req.method + " not allowed");
                }

                let params = req.url.split('/');
                if(params.length != 4) {
                    serveErrorJson(rep, 400, "Bad Url");
                }
                
                let skip = parseInt(params[2]);
                let limit = parseInt(params[3]);

                var content = "";
                req.setEncoding("utf8");
                req.on("data", function (data) {
                    content += data;
                }).on("end", function () {
                    var obj = {};
                    try {
                        obj = JSON.parse(content);
                        
                        persons.find({
                            login: getUsernameBySessionID(obj.sessionID)
                        }, {
                            projection: {
                                messages: 1
                            }
                        }).toArray(function (err, docs) {
                            if (err) {
                                serveErrorJson(rep, 404, "Messages not found");
                                return;
                            }
                            //console.log("docs: " + docs[0].messages);
                            messages.find({
                                _id: { $in: docs[0].messages }
                            }).skip(skip).limit(limit).toArray(function(err, msgArray) {
                                if (err) {
                                    serveErrorJson(rep, 404, "Messages not found");
                                    return;
                                }

                                rep.writeHead(200, {"Content-type": "application/json"});
                                rep.write(JSON.stringify(msgArray));
                                rep.end();
                            })
                            
                        });
                    } catch (ex) {
                        serveErrorJson(rep, 406, "Invalid JSON");
                        return;
                    }
                });
            }
            else {
				serveError(rep, 403, 'Access denied');
			}
		}
	}
);