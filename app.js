const qa = require('./qa');
const fs = require('fs');

var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');

// https://github.com/cure53/DOMPurify
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

https://www.npmjs.com/package/bad-words
var Filter = require('bad-words');

var app = express();

//configure body-parser for express
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

// Create a static folder for assets 
// https://stackoverflow.com/a/63829176/58456
// app.use(express.static('dist'))

// Get the next question. 
app.get('/', function (req, res) {
    
    // Get the user ID 
    var ipAddress = req.connection.remoteAddress;
    var userID = qa.GetUserIDByIPAddress(ipAddress); 
    console.log("UserID: " + userID + ", IP Address: " + ipAddress )
    
    // Get the next question 
    var question = qa.GetNextQuestion( userID ) 

    // Check to see if there are any more questions to answer
    if( question == null) {
        // No more questions. Let the user add some. 
        res.redirect('/ask'); 
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

app.post('/answer', function (req, res) {

    // Get the answer. 
    let answer = 0;
    if( req.body.answer == 'Yes') {
        answer = 1 ; 
    } else if( req.body.answer == 'No') {
        answer = 0 ; 
    } else if( req.body.answer == 'Skip') {
        answer = null ; 
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
    res.redirect('/'); 

});


app.get('/ask', function (req, res) {

    // Get the user ID 
    var ipAddress = req.connection.remoteAddress;
    var userID = qa.GetUserIDByIPAddress(ipAddress); 
    // console.log("UserID: " + userID + ", IP Address: " + ipAddress )    

    // Load the templates
    let html_index = fs.readFileSync('index.html').toString();
    let html_askquestion = fs.readFileSync('askquestion.html').toString();    
    let html_userinfo = fs.readFileSync('userinfo.html').toString();
    
    // Update the templates with content.   
    html_userinfo = html_userinfo.replace("{{USER_ID}}", userID );
    html_userinfo = html_userinfo.replace("{{USER_IPADDRESS}}", ipAddress );
    html_index = html_index.replace("{{USER_INFO}}", html_userinfo )
    html_index = html_index.replace("{{BODY}}", html_askquestion )

    res.send( html_index );
    
});

app.post('/ask', function (req, res) {

    // Get the user ID 
    var ipAddress = req.connection.remoteAddress;
    var userID = qa.GetUserIDByIPAddress(ipAddress); 
    console.log("UserID: " + userID + ", IP Address: " + ipAddress )

    // Sanitize the input 
    const window = new JSDOM('').window;
    const DOMPurify = createDOMPurify(window);
    var questionText = DOMPurify.sanitize(req.body.question, {USE_PROFILES: {html: false}});
    if( questionText.length < 20 ) {
        res.send( "Error: Question is invalid or too small. Try again" );
        return; 
    }

    // Check for bad words 
    filter = new Filter();
    if( filter.isProfane( questionText ) ) {
        res.send( "Error: Profanity detected, Be nice and try again" );
        return; 
    }

    // Add the new question 
    qa.AskQuestion( userID, questionText); 

    // Redirect back to index
    res.redirect('/');     
});


app.get('/report', function (req, res) {   
    res.send( "ToDo");
});

app.get('/stats', function (req, res) {   

    // Get the user ID 
    var ipAddress = req.connection.remoteAddress;
    var userID = qa.GetUserIDByIPAddress(ipAddress); 
    // console.log("UserID: " + userID + ", IP Address: " + ipAddress )    

    var userData = qa.GetUserData(userID) ;

    let html_report ='';
    html_report += "<div>";
    html_report += "<h2>Your Answers</h2>";
    html_report += "<table width='100%'>";
    html_report += "<tr><th>Question</th><th>Answer</th><th>Probability of Yes</th></tr>";

    for( var offset = 0 ; offset < userData.answers.length ; offset++) {
        html_report += "<tr>";
        
        // Get the question data. 
        var questionData = qa.GetQuestionData( userData.answers[offset].questionID ); 
        
        // Check to see if the question has been removed. 
        if( questionData.questions.length == 0 ) {
            // This question has been removed. 
            html_report += "<td colspan='3'><em>Question deleted</em></td>"
            html_report += "</tr>";
            continue ; 
        }

        // Print the question 
        html_report += "<td>" + questionData.questions[0].text + "</td>"
        html_report += "<td><strong>" ;
        if( userData.answers[offset].answer == 1) {
            html_report += "Yes"; 
        } else if( userData.answers[offset].answer == 0) {
            html_report += "No"; 
        } else {
            html_report += "Skipped"; 
        }      
        html_report += "</strong></td>"
        html_report += "<td>" + Math.round( questionData.questions[0].probability * 100)  + "%</td>" ;
        html_report += "</tr>";
    }
    html_report += "</table>";
    html_report += "</div>";

    // Load the templates
    let html_index = fs.readFileSync('index.html').toString();    
    let html_userinfo = fs.readFileSync('userinfo.html').toString();
    // let html_report = fs.readFileSync('report.html').toString();    
    
    // Update the templates with content.
    html_userinfo = html_userinfo.replace("{{USER_ID}}", userID );
    html_userinfo = html_userinfo.replace("{{USER_IPADDRESS}}", ipAddress );
    html_index = html_index.replace("{{USER_INFO}}", html_userinfo )
    html_index = html_index.replace("{{BODY}}", html_report )

    res.send( html_index );
    
});



var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Example app listening at http://%s:%s", host, port);
});
