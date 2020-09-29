const qa = require('./qa');
const fs = require('fs');

var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');

var app = express();

//configure body-parser for express
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

// Create a static folder for assets 
// https://stackoverflow.com/a/63829176/58456
app.use(express.static('dist'))

// Get the next question. 
app.get('/', function (req, res) {
    
    // Get the user ID 
    var ipAddress = req.connection.remoteAddress;
    var userID = qa.GetUserIDByIPAddress(ipAddress); 
    console.log("UserID: " + userID + ", IP Address: " + ipAddress )
    
    // Get the next question 
    var question = qa.GetQuestion( userID ) 

    // Check to see if there are any more questions to answer
    if( question == null) {
        // No more questions. Let the user add some. 
        res.redirect('/add'); 
        return 
    }


    // Load the templates
    let html_index = fs.readFileSync('index.html').toString();
    let html_question = fs.readFileSync('question.html').toString();
    let html_userinfo = fs.readFileSync('userinfo.html').toString();

    // Update the templates with content.    
    html_question = html_question.replace("{{QUESTION_TEXT}}", question.text )
    html_question = html_question.replace("{{QUESTION_ID}}", question.id )    
    html_userinfo = html_userinfo.replace("{{USER_ID}}", userID );
    html_userinfo = html_userinfo.replace("{{USER_IPADDRESS}}", ipAddress );
    html_index = html_index.replace("{{USER_INFO}}", html_userinfo )
    html_index = html_index.replace("{{BODY}}", html_question )

    res.send( html_index );
});

app.post('/', function (req, res) {

    // Get the answer. 
    let answer = 0;
    if( req.body.answer == 'Yes') {
        answer = 1 ; 
    } else if( req.body.answer == 'No') {
        answer = 0 ; 
    } else {
        res.send( "Error: unknown answer" );
        return ; 
    }

    // Get the user ID 
    var ipAddress = req.connection.remoteAddress;
    var userID = qa.GetUserIDByIPAddress(ipAddress); 
    console.log("UserID: " + userID + ", IP Address: " + ipAddress )   

    // Update the database 
    qa.AnswerQuestion( userID, req.body.questionID, answer )
    
    // Redirect back to index
    res.redirect('?'); 

});


app.get('/add', function (req, res) {

    // Get the user ID 
    var ipAddress = req.connection.remoteAddress;
    var userID = qa.GetUserIDByIPAddress(ipAddress); 
    console.log("UserID: " + userID + ", IP Address: " + ipAddress )    

    // Load the templates
    let html_index = fs.readFileSync('index.html').toString();
    let html_askquestion = fs.readFileSync('addquestion.html').toString();    
    let html_userinfo = fs.readFileSync('userinfo.html').toString();
    
    // Update the templates with content.   
    html_userinfo = html_userinfo.replace("{{USER_ID}}", userID );
    html_userinfo = html_userinfo.replace("{{USER_IPADDRESS}}", ipAddress );
    html_index = html_index.replace("{{USER_INFO}}", html_userinfo )
    html_index = html_index.replace("{{BODY}}", html_askquestion )

    res.send( html_index );
    
});

app.post('/add', function (req, res) {

    // Get the user ID 
    var ipAddress = req.connection.remoteAddress;
    var userID = qa.GetUserIDByIPAddress(ipAddress); 
    console.log("UserID: " + userID + ", IP Address: " + ipAddress )

    // Add the new question 
    qa.AskQuestion( userID, req.body.question); 

    // Redirect back to index
    res.redirect('/');     
});


var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Example app listening at http://%s:%s", host, port);
});
