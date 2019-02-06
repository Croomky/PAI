var fs = require('fs');
var http = require('http');
var path = require('path');
var mime = require('mime');
var mongodb = require("mongodb");

var mongo = mongodb.MongoClient;
var ObjectId = mongodb.ObjectId;

var debugLog = true; // turning on logging to the console

const listeningPort = 8888;
const dbUrl = "mongodb://localhost:27017";
const dbName = "pai";

var server = null;
var db = null;
var persons = null;

mongo.connect(dbUrl, { useNewUrlParser: true }, function(err, conn) {
	
	if(err) {
			console.log("Connection to database failed");
			process.exit();
	}

	console.log("Connection to database established");
	
	db = conn.db(dbName);
	// db.dropDatabase(); // uncomment to clear database
	persons = db.collection("persons");
	persons.find().count(function(err, n) {
		if(n == 0) {
			console.log("No persons, initializing by sample data");
			try {
                var examplePersons = JSON.parse(fs.readFileSync("persons.json", 'utf8'));
                persons.insertMany(examplePersons);
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

server = http.createServer().on('request', function (req, rep) {
	
	if(debugLog) console.log('HTTP request: ' + req.method + " " + req.url);
	
	switch(req.url) {
        case '/':
            serveFile(rep, 'html/index.html', 200, '');
            break;
        case '/favicon.ico':
            serveFile(rep, 'img/favicon.ico', 200, '');
            break;
        case '/persons':
            persons.find().collation({ locale: "pl" }).sort({ lastName: +1, firstName: +1 }).project({firstName: true, lastName: true}).toArray(function (err, docs) {
                if (err) {
                    serveErrorJson(rep, 404, "Persons not found");
                    return;
                }
                rep.writeHead(200, {"Content-type": "application/json"});
                rep.write(JSON.stringify(docs));
                rep.end();
            })
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
                            persons.insertOne(obj, function (err, insResult) {
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
                        query = {$where: "(this.firstName + ' ' + this.lastName).match(/" + pattern + "/i)"};
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

            } else if (/\/person\//.test(req.url)) {

                var a = req.url.split("/");
                var id;
                try {
                    id = ObjectId(a[2]);
                } catch (ex) {
                    serveErrorJson(rep, 406, "Invalid id " + a[2]);
                    return;
                }

                switch (req.method) {

                    case "GET":
                        persons.findOne({_id: id}, function (err, doc) {
                            if (err || !doc) {
                                serveErrorJson(rep, 404, "Object " + a[2] + " not found");
                                return;
                            }
                            rep.writeHead(200, {"Content-type": "application/json"});
                            rep.end(JSON.stringify(doc));
                        });
                        break;

                    case "DELETE":
                        persons.findOneAndDelete({_id: id}, function (err) {
                            if (err) {
                                serveErrorJson(rep, 405, "Delete failed");
                                return;
                            }
                            rep.writeHead(200, {"Content-type": "application/json"});
                            rep.end(JSON.stringify({}));
                        });
                        break;

					case "PUT":
                        var content = "";
                        req.setEncoding("utf8");
                        req.on("data", function (data) {
                            content += data;
                        }).on("end", function () {
                            var obj = {};
                            try {
                                obj = JSON.parse(content);
                                if (!("firstName" in obj && "lastName" in obj)) {
                                    serveErrorJson(rep, 406, "Invalid data");
                                    return;
                                }
                            } catch (ex) {
                                serveErrorJson(rep, 406, "Invalid JSON");
                                return;
                            }
                            persons.findOneAndUpdate({_id: id}, {$set: obj}, {returnOriginal: false}, function (err, updStatus) {
                                if (updStatus.ok) {
                                    rep.writeHead(200, {"Content-type": "application/json"});
                                    rep.end(JSON.stringify(updStatus.value));
                                } else {
                                    serverErrorJson(rep, 406, "Update failed");
                                }
                            });
                        });
                        break;

                    default:
                        serveErrorJson(rep, 405, "Method " + req.method + " not allowed");
                }

            } else if (/\/transfer\//.test(req.url)) {

                var a = req.url.split("/");
                var id;
                try {
                    id = ObjectId(a[2]);
                } catch (ex) {
                    serveErrorJson(rep, 406, "Invalid id " + a[2]);
                    return;
                }

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
                                if (!("amount" in obj) || typeof (obj.amount) != "number") {
                                    serveErrorJson(rep, 406, "Invalid data");
                                    return;
                                }
                            } catch (ex) {
                                serveErrorJson(rep, 406, "Invalid JSON");
                                return;
                            }
                            persons.findOneAndUpdate({_id: id}, {$inc: {amount: obj.amount}}, {returnOriginal: false}, function (err, updStatus) {
                                if (updStatus.ok) {
                                    rep.writeHead(200, {"Content-type": "application/json"});
                                    rep.end(JSON.stringify(updStatus.value));
                                } else {
                                    serverErrorJson(rep, 406, "Update failed");
                                }
                            });
                        });
                        break;
                    default:
                        serveErrorJson(rep, 405, "Method " + req.method + " not allowed");
                }
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
            }
            else {
				serveError(rep, 403, 'Access denied');
			}
		}
	}
);