var builder = require('botbuilder');
 var botbuilder_azure = require("botbuilder-azure");
 var restify = require('restify');
 var https = require('https');

 var server = restify.createServer();

 server.listen(process.env.port || process.env.PORT || 3978, function () {
 console.log('%s listening to %s', server.name, server.url);
 });

 // Create chat connector for communicating with the Bot Framework Service
 var connector = new builder.ChatConnector({
 appId: process.env.MicrosoftAppId,
 appPassword: process.env.MicrosoftAppPassword
 });

 server.post('/api/messages', connector.listen());

 var inMemoryStorage = new builder.MemoryBotStorage();

 var luisAppId = process.env.LuisAppId;
 var luisSubscriptionKey = process.env.LuisSubscriptionKey;
 var luisApiHostName = process.env.LuisApiHostName || 'westus.api.cognitive.microsoft.com';
 var luisModelUrl = 'https://' + luisApiHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisSubscriptionKey;

 //Create the default bot session and dialog
 var bot = new builder.UniversalBot(connector, function (session, args) {
 session.send("Welcome to **Randomator**. The most *random* way to get values...");
 });

 bot.set('storage', inMemoryStorage);

 // Create a recognizer that gets intents from LUIS, and add it to the bot
 var recognizer = new builder.LuisRecognizer(luisModelUrl);
 bot.recognizer(recognizer);

 // Add a dialog for each intent that the LUIS app recognizes. 
 bot.dialog('RandomNumberDialog',
     [
         function (session, args, next) {

             var intent = args.intent;
             var range = builder.EntityRecognizer.findAllEntities(intent.entities, 'builtin.number');

             var actionType = args.intent;
             var searchType = "number";
             var actionLabel = "random number";
             var searchQueryString = '';

             if (range.length > 0) searchQueryString = '/range?min=' + range[0].entity + '&max=' + range[1].entity;

             showRandomResults(session, actionLabel, searchType, searchQueryString);
         },
     ]
 ).triggerAction({
     matches: 'GetRandomNumber',
 })

 bot.dialog('UniqueIdentifierDialog',
     [
         function (session, args, next) {

             var actionType = args.intent;
             var searchType = "guid";
             var actionLabel = "random unique identifier";
             var searchQueryString = '';

             showRandomResults(session, actionLabel, searchType, searchQueryString);
         },
     ]
 ).triggerAction({
     matches: 'GetUniqueIdentifier',
 })

 bot.dialog('RandomColorDialog',
     [
         function (session, args, next) {

             var actionType = args.intent;
             var searchType = "color";
             var actionLabel = "random color";
             var searchQueryString = '';

             showRandomResults(session, actionLabel, searchType, searchQueryString);
         },
     ]
 ).triggerAction({
     matches: 'GetRandomColor',
 })

 bot.dialog('ColorDialog',
     [
         function (session, args, next) {

             var intent = args.intent;

             var color = builder.EntityRecognizer.findEntity(intent.entities, 'Color');
             var format = builder.EntityRecognizer.findEntity(intent.entities, 'ColorConversionType');

             var actionType = args.intent;
             var searchType = "color";
             var actionLabel = "conversion of " + color.entity.toUpperCase();
             var searchQueryString = '';
             var searchQueryString = '/convert?color=' + color.entity + '&format=' + format.entity;

             showRandomResults(session, actionLabel, searchType, searchQueryString);
         },
     ]
 ).triggerAction({
     matches: 'ConvertColor',
 })

 bot.dialog('GreetingDialog',
     (session) => {
         session.send("Welcome to **Randomator**. The most *random* way to get values...");
         session.endDialog();
     }
 ).triggerAction({
     matches: 'None',
 })

 bot.dialog('HelpDialog',
     (session) => {
         session.send('You reached the Help intent. You said \'%s\'.', session.message.text);
         session.endDialog();
     }
 ).triggerAction({
     matches: 'Help'
 })

  //CALL TRAINING RANDOMIZER SERVICE
  var showRandomResults = (function (session, actionLabel, searchType, searchQueryString) {

    var optionsSearch = {
        host: 'traininglabservices.azurewebsites.net',
        port: 443,
        path: '/api/random/' + searchType + searchQueryString,
        method: 'GET'
    };

    var reqGet = https.request(optionsSearch, function (res) {
        res.on('data', function (randomResults) {

            var randomResult = JSON.parse(randomResults.toString());

            var card = {
                'contentType': 'application/vnd.microsoft.card.adaptive',
                'content': {
                    'type': 'AdaptiveCard',
                    'body': [

                        {
                            "type": "TextBlock",
                            "text": actionLabel.toUpperCase(),
                            "size": "large",
                            "isSubtle": true
                        },
                        {
                            "type": "TextBlock",
                            "text": "Here's your **" + actionLabel.toLowerCase() + "**:",
                            "spacing": "none",
                        },
                        {
                            "type": "ColumnSet",
                            "columns": [
                                {
                                    "type": "Column",
                                    "width": "auto",
                                    "items": [
                                        {
                                            "type": "TextBlock",
                                            "text": randomResult.value,
                                            "size": "extraLarge",
                                            "color": "accent"
                                        }
                                    ]
                                }

                            ]
                        }
                    ]
                }
            };

            var msg = new builder.Message(session).addAttachment(card);

            session.send(msg);

        });
    });

    reqGet.end();
    reqGet.on('error', function (e) {
        session.send(e.toString());
    });

});