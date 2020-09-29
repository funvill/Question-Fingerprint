const fs = require('fs');

let rawdata = fs.readFileSync('data.json');
let data = JSON.parse(rawdata);

// Adds a question to the Question dabase. 
// We start the question probability at 0.1 so it is the last question asked.
// After the first person answers this question the probability will be recalulated and we will 
// have a better value. 
// 
// ToDo: 
// - Check to see if the question has already been asked. We will probably need to do some sort 
//   of fuzy search to find simlare answers.
function AskQuestion( userID, questionText ) {
    var date = new Date(); 
    var row = {"id": data.questions.length, "created": date.toISOString(), "text": questionText, "probability": 0.1 }
    data.questions.push( row); 

    // Save database to file. 
    fs.writeFileSync('data.json', JSON.stringify(data))
}

// This is a very expensive function (takes a long time and lots of CPU)
// There are defenitly ways to optimize this function that we can think about in the future. 
function RecalulateProbability(questionID) {

    // Filter all the answers to just answers to this question. 
    var allAnswersToThisQuestion = data.answers.filter(function(answer) {
        return answer.questionID == questionID; 
    })

    // Find the total of all the answer value. 
    var sumOfAnswers = 0 ; 
    for( var offset = 0 ; offset < allAnswersToThisQuestion.length ; offset++) {
        if( allAnswersToThisQuestion[offset].answer == null ) {
            continue; 
        }
        sumOfAnswers += allAnswersToThisQuestion[offset].answer ; 
    }

    // Find the question by its ID
    for( var offset = 0 ; offset < data.questions.length ; offset++) {
        if( data.questions[offset].id == questionID ) {
            // Found the question. 

            // Check to see if this question has never been answered. 
            if( allAnswersToThisQuestion.length == 0 ) {
                // Never been answered. 
                // Give it a hardcoded answer of 0.1 as if it was new. 
                data.questions[offset].probability = 0.1; 
            } else {
                // Update the probability 
                data.questions[offset].probability = sumOfAnswers / allAnswersToThisQuestion.length ; 
            }
        }
    }
}

function RecalulateAllProbability() {
    // Recalulate all the questions. 
    for(var offset = 0 ; offset < data.questions.length ; offset ++ ) {
        // Recalulate the question's probability 
        qa.RecalulateProbability(data.questions[offset].id); 
    }
    // Save database to file. 
    fs.writeFileSync('data.json', JSON.stringify(data))
}

// The user has answered a question. 
// 
function AnswerQuestion(userID, questionID, answer) {

    // Check to make sure that this user has not already answered this question before. 
    // If they have, then update their answer. 
    for( var offset = 0 ; offset < data.answers.length ; offset++ ) {
        if( data.answers[offset].userID == userID && data.answers[offset].questionID == questionID ) {
            // They have answered this question before.
            // If the answer is different then update it. 
            if( data.answers[offset].answer != answer ) {
                // Update the answer 
                data.answers[offset].answer = answer; 
                // Recalulate the question's probability 
                RecalulateProbability(questionID); 

                // Save database to file. 
                fs.writeFileSync('data.json', JSON.stringify(data))
                return ; 
            }
        }
    }

    // Add the new answer. 
    var date = new Date(); 
    var row = {"id": data.answers.length, "userID": userID, "created": date.toISOString(), "questionID": questionID, "answer": answer} ; 
    data.answers.push( row); 

    // Recalulate the question's probability 
    RecalulateProbability(questionID); 

    // Save database to file. 
    fs.writeFileSync('data.json', JSON.stringify(data))
}

function GetNextQuestion(userID) {
   
    // Get a list of questions that this user has answered before. 
    var questionsAnswered = data.answers.filter( function (answer) {
        return answer.userID == userID 
    })

    // console.log( "questionsAnswered: " )
    // console.log( questionsAnswered )

    // Filter questions for ones that have not been answered before 
    var possibleQuestions = data.questions.filter( function(question){
        for( var offset = 0 ; offset < questionsAnswered.length ; offset++) {
            if( questionsAnswered[offset].questionID == question.id ) {
                return false; 
            }
        }
        return true; 
    })

    // console.log( "possibleQuestions: ")
    // console.log( possibleQuestions )

    // Sort the possible questions based on their probability closeness to 0.5 
    possibleQuestions.sort(function(a,b){
        if( Math.abs( 0.5 - a.probability ) > Math.abs( 0.5 - b.probability ) ) {
            return 1; 
        } else if( Math.abs( 0.5 - a.probability ) < Math.abs( 0.5 - b.probability ) ) {
            return -1;
        }
        return 0 ;
    })

    // console.log( "possibleQuestions AfterSort: ")
    // console.log( possibleQuestions )

    // Return the top question 
    return possibleQuestions[0] ; 
}

function GetQuestionData(questionID) {
    var output = {'questions': [] };

    // Add the question
    for( var offset = 0 ; offset < data.questions.length ; offset++) {
        if(data.questions[offset].id == questionID ) {
            output.questions.push( data.questions[offset] )
            break; 
        }
    }

    return output; 
}

function GetUserData(userID) {
    var output = {'users': [], 'answers': [] };

    // Add the user info 
    for( var offset = 0 ; offset < data.users.length ; offset++) {
        if(data.users[offset].id == userID ) {
            output.users.push( data.users[offset] )
            break; 
        }
    }
    
    // Add the answered questions
    for( var offset = 0 ; offset < data.answers.length ; offset++) {
        if(data.answers[offset].userID == userID ) {
            output.answers.push( data.answers[offset] )
        }
    }

    return output; 
}


function GetUserIDByIPAddress(ipAddress) {
    for( var offset = 0 ; offset < data.users.length ; offset++) {
        if( data.users[offset].ipAddress == ipAddress ) {
            // Found the user 
            return data.users[offset].id ; 
        }
    }

    // Could not find the user by the IP address. 
    // Add a new users. 
    var date = new Date(); 
    var row = { "id": data.users.length, "created": date.toISOString(), "ipAddress": ipAddress };
    data.users.push( row )
        
    // Save database to file. 
    fs.writeFileSync('data.json', JSON.stringify(data))

    // Return the new length. 
    return data.users.length ;  
}

// Exports 
// -----------------------------------------------------------------------

// Alters database 
module.exports.AnswerQuestion = AnswerQuestion; 
module.exports.AskQuestion = AskQuestion; 
module.exports.RecalulateAllProbability = RecalulateAllProbability; 

// Read only
module.exports.GetNextQuestion = GetNextQuestion; 
module.exports.GetUserData = GetUserData; 
module.exports.GetQuestionData = GetQuestionData; 
module.exports.GetUserIDByIPAddress = GetUserIDByIPAddress; 
