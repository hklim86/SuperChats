'use strict';
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
//const venom = require('venom-bot');
const wppconnect = require('@wppconnect-team/wppconnect');
const puppeteer = require('puppeteer');
const api = require('axios');
const port = process.env.PORT || 3000;
const apiRoot = "/api";
const fs = require('fs');


const app = express();
var clientArray = [];

var browserSession = [];
var sessionToken = [];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
//app.use(cors({ origin: /http:\/\/localhost/ }));
app.use(cors({ origin: /http:\/\/194.233.79.27/ })); 
app.options("*", cors());

var replyMessage = [];

const router = express.Router();

router.get("/", (req, res) => {
    res.send("OK");
}); 
 
router.put("/:session/check", async function (req, res) {
    let client = clientArray[req.params.session];
    let action = req.body.action || false;
    let control = req.body.control || false;
    let offHook = req.body.offHook || false;

    if (action) {
        if (action == "checking") {

            if (browserSession[req.params.session] && browserSession[req.params.session].wppconnect) {
                const promiseStatus = typeof browserSession[req.params.session].wppconnect !== 'string' ? 'Pending' : browserSession[req.params.session].wppconnect;

                return res.json({
                    message: browserSession[req.params.session]
                });
            }

            return res.json({
                message: 'Whatsapp browser not opened'
            });

        } else if (action == "control") {
            if (control) {
                if (control == "closeClient") {

                    try {
                        if (client == undefined) {

                            console.log('Whatsapp client is not connected');

                            return res.json({
                                message: 'Client not open'
                            });
                        }

                        if (client) {

                            if (offHook) {
                                Object.assign(browserSession[req.params.session], {
                                    offHook: offHook
                                });
                            }

                            await client.close();

                            browserSession[req.params.session] = undefined;
                            clientArray[req.params.session] = undefined;

                            return res.json({
                                message: 'WhatsApp client closed successfully'
                            });
                        }

                        return res.json({
                            message: 'Client not open'
                        });

                    } catch (error) {
                        console.error('Error during closing WhatsApp client:', error);
                        return res.json({
                            message: 'Failed to close WhatsApp client'
                        });
                    }

                } else if (control == "deleteBrowser") {
                    try {
                        if (browserSession[res.params.session] == undefined) {

                            console.log('Whatsapp browser is not opened');

                            return res.json({
                                message: 'Client browser not opened'
                            });
                        }

                        browserSession[res.params.session] = undefined;

                        return res.json({
                            message: 'WhatsApp browser closed successfully'
                        });

                    } catch (error) {
                        console.error('Error during closing WhatsApp browser:', error);
                        return res.json({
                            message: 'Failed to close WhatsApp browser'
                        });
                    }
                } else if (control == "deleteClient") {
                    try {
                        if (client == undefined) {

                            console.log('Whatsapp client is not connected');

                            return res.json({
                                message: 'Client is not exist'
                            });
                        }

                        clientArray[res.params.session] = undefined;

                        return res.json({
                            message: 'WhatsApp client deleted successfully'
                        });

                    } catch (error) {
                        console.error('Error during delete WhatsApp client:', error);
                        return res.json({
                            message: 'Failed to delete WhatsApp client'
                        });
                    }
                }
            }
        }
    }
});

router.get("/:session/connect", async function (req, res) {
    let client = clientArray[req.params.session];

    //if (client != null) {

    //    var clientConnection = await client.getConnectionState();

    //    if (clientConnection == "CONNECTED")
    //        return res.json({
    //            message: browserSession[req.params.session]
    //        });

    //    /*if (here == "UNPAIRED")
    //        delete clientArray['60107072567']
    //        _.omit(clientArray, req.params.session);
    //        return res.json({
    //            message: "isNotLogged"
    //        });*/
    //    client.close();
    //    clientArray[req.params.session] = undefined;
    //}

    const webhook_account = req.query.account || '';
    const webhook_account_role = req.query.role || '';

    if (browserSession[req.params.session] != null) {

        if (clientArray[req.params.session] != null) {
            return res.json({
                message: {
                    status: 'isLogged'
                }
            });
        } else {

            await browserSession[req.params.session].wppconnect;

            return res.json({
                message: browserSession[req.params.session]
            });
        }
    } else {

        browserSession[req.params.session] = {
            status: "waitForLogin",
            wppconnect: wppconnect.create({
                //session
                session: req.params.session, //Pass the name of the client you want to start the bot
                //catchQR
                catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => {
                    //console.log('Number of attempts to read the qrcode: ', attempts);
                    //console.log('Terminal qrcode: ', asciiQR);
                    //console.log('base64 image string qrcode: ', base64Qrimg);
                    //console.log('urlCode (data-ref): ', urlCode);
                    browserSession[req.params.session] = { status: "waitForLogin", qrcode: base64Qrimg };
                    callWebHook(client, req, 'qrcode', { qrcode: base64Qrimg, urlcode: urlCode, account: webhook_account, accountRole: webhook_account_role });
                    //console.log('base64 image string qrcode: ', base64Qrimg);
                    return res.json({
                        message: browserSession[req.params.session]
                    });
                },
                statusFind: (statusSession, session) => {
                    //console.log('Status Session: ', statusSession); //return isLogged || notLogged || browserClose || qrReadSuccess || qrReadFail || autocloseCalled || desconnectedMobile || deleteToken || chatsAvailable || deviceNotConnected || serverWssNotConnected || noOpenBrowser || initBrowser || openBrowser || connectBrowserWs || initWhatsapp || erroPageWhatsapp || successPageWhatsapp || waitForLogin || waitChat || successChat
                    //Create session wss return "serverClose" case server for close
                    //console.log('Session name: ', session);

                    if (clientArray[req.params.session] != null && statusSession == "notLogged") {
                        var client = clientArray[req.params.session];

                        //delete clientArray[req.params.session];

                        clientArray[session] = undefined;

                        if (browserSession[req.params.session] != null) {
                            browserSession[session] = { status: statusSession };
                        }

                        client.close();
                    }

                    try {
                        if (statusSession === 'autocloseCalled' || statusSession === 'desconnectedMobile' || statusSession === 'browserClose') {
                            var client = clientArray[req.params.session];
                            var browser = browserSession[req.params.session];

                            if (client != null) {
                                clientArray[session] = undefined;
                                client.close();
                            }

                            if (browser != null) {

                                if (statusSession == 'desconnectedMobile') {
                                    browserSession[session] = {
                                        status: "notLogged"
                                    }
                                } else if (statusSession === 'autocloseCalled' || statusSession === 'browserClose') {
                                    browserSession[session] = undefined;
                                }
                            }
                        }

                        if (statusSession == 'isLogged') {
                            if (clientArray[req.params.session] != null) {
                                callWebHook(client, req, 'status-find', { status: statusSession });
                            } else {
                                callWebHook(client, req, 'status-find', { status: 'notLogged' });
                            }
                        }
                        else if (statusSession == 'inChat') {

                            if (client.waitForInChat()) {
                                callWebHook(clientArray[req.params.session], req, 'status-find', { status: statusSession });
                            }

                            //if (clientArray[req.params.session] != null || browserSession[req.params.session] != null) {
                            //    callWebHook(clientArray[req.params.session], req, 'status-find', { status: statusSession });
                            //} else {
                            //    callWebHook(client, req, 'status-find', { status: 'notLogged' });
                            //}
                        }
                        else {
                            callWebHook(client, req, 'status-find', { status: statusSession });
                        }

                    } catch (error) { }
                },
                headless: true, // Headless chrome
                devtools: false, // Open devtools by default
                useChrome: true, // If false will use Chromium instance
                debug: false, // Opens a debug session
                logQR: true, // Logs QR automatically in terminal
                browserWS: '', // If u want to use browserWSEndpoint
                browserArgs: ['--js-flags="--max_old_space_size=80" --disable-web-security', '--no-sandbox', '--disable-web-security', '--aggressive-cache-discard', '--disable-cache', '--disable-application-cache', '--disable-offline-load-stale-cache', '--disk-cache-size=0', '--disable-background-networking', '--disable-default-apps', '--disable-extensions', '--disable-sync', '--disable-translate', '--hide-scrollbars', '--metrics-recording-only', '--mute-audio', '--no-first-run', '--safebrowsing-disable-auto-update', '--ignore-certificate-errors', '--ignore-ssl-errors', '--ignore-certificate-errors-spki-list'], // Parameters to be added into the chrome browser instance
                //browserArgs: [''], // Parameters to be added into the chrome browser instance
                puppeteerOptions: {
                    userDataDir: './tokens/' + req.params.session, // or your custom directory
                }, // Will be passed to puppeteer.launch
                disableWelcome: true, // Option to disable the welcoming message which appears in the beginning
                updatesLog: true, // Logs info updates automatically in terminal
                autoClose: 60000, // Automatically closes the wppconnect only when scanning the QR code (default 60 seconds, if you want to turn it off, assign 0 or false)
                tokenStore: 'file', // Define how work with tokens, that can be a custom interface
                folderNameToken: './tokens', //folder name when saving tokens
            }).then(async function (client) {
                clientArray[req.params.session] = client;
                browserSession[req.params.session] = { status: "isLogged" };

                await listenMessages(client, req);
                await listenAcks(client, req);

                return res.json({
                    message: browserSession[req.params.session]
                });
            }).catch((e) => {
                return null;
            })
        };
    }
});

router.get("/:session/connect_v1", async function (req, res) {
    let client = clientArray[req.params.session];
    let browser = browserSession[req.params.session];
    //let isChannel = Boolean(req.query.isChannel) || false;
    //let listenMessage = Boolean(req.query.listenMessage) || true;

    let isChannel = (req.query.isChannel) == 'true' ? true : false;
    let listenMessage = (req.query.listenMessage) == 'false' ? false : true;


    if (browser && browser.wppconnect) {
        const promiseStatus = typeof browser.wppconnect !== 'string' ? 'Pending' : browserSession[req.params.session].wppconnect;

        if (promiseStatus === 'Pending') {
            await browser.wppconnect;
            await clientArray[req.params.session].isMainReady();
            return res.json({
                message: browserSession[req.params.session]
            });
        } else if (promiseStatus === 'fullfilled') {
            return res.json({
                message: browserSession[req.params.session]
            });
        }
        //else {
        //    let session = browser.wppconnect;
        //    console.log(browserSession)
        //    //session.destroy();
        //    browserSession[req.params.session] = undefined;
        //    console.log(browserSession)
        //}
    } else {
        browserSession[req.params.session] = {
            status: "waitForLogin",
            wppconnect: createSession(req, res, listenMessage, (isChannel === true ? callChannelWebHook : callWebHook))
        };
    }
});

router.get("/:session/disconnect", async function (req, res) {
    let client = clientArray[req.params.session];

    if (client != null) {
        await clientArray[req.params.session].isMainReady();

        await client.logout();

        await client.close();

        callWebHook(client, req, 'status-find', { status: 'browserClose' });

        return res.json({
            message: "logout"
        });
    } else {
        return res.json({
            message: "notLogged"
        });
    }
});

router.get("/:session/checkConnect", async function (req, res) {
    let client = clientArray[req.params.session];

    if (client != null) {

        var clientConnection = await client.getConnectionState();

        if (clientConnection == "CONNECTED") {
            return res.json({
                message: "isLogged"
            });
        } else {
            return res.json({
                message: "notLogged"
            });
        }
    } else {
        return res.json({
            message: "notLogged"
        });
    }
});

router.get("/:session/closeClient", async function (req, res) {

    let client = clientArray[req.params.session];
    let offHook = (req.query.offHook) == 'true' ? true : false;

    if (client != null) {

        client.close();

        if (browserSession[req.params.session]) {
            if (!offHook)
                Object.assign(browserSession[req.params.session], {
                    offHook: offHook
                });
        }

        return res.json({
            message: "clientClosed"
        });
    }
    else {
        return res.json({
            message: "clientNotFound"
        });
    }
});

router.get("/:session/receiverValidation", async function (req, res) {
    let client = clientArray[req.params.session];

    const receiverList = req.query.receiver || false;

    if (client != null) {
        var response = await client.checkNumberStatus(receiverList + '@c.us');

        return res.json({
            message: response
        });
    }
    else {
        return res.status(400).json("notLogged.");
    }
});

router.get("/:session/closeSession", async function (req, res) {

    let client = clientArray[req.params.session];

    session: req.params.session;

    statusFind: (statusSession, session) => {
        console.log(statusSession)
    }

    if (client != null) {

        var clientConnection = await client.getConnectionState();


        if (clientConnection == "CONNECTED") {

            //clientArray[req.params.session] = undefined;

            await client.logout();

            callWebHook(client, req, 'status-find', { status: 'logout' });

            return res.json({
                message: "logout"
            });
        }
    }
});

router.get("/:session/getGroupList", async function (req, res) {
    let client = clientArray[req.params.session];

    if (client != null) {

        var clientConnection = await client.getConnectionState();

        if (clientConnection == "CONNECTED") {

            let response = await client.getGroups()

            //clientArray[req.params.session] = undefined;

            //await client.logout();

            //callWebHook(client, req, 'status-find', { status: 'logout' });

            return res.json({
                message: response
            });
        }
    }
});

router.post("/:session/sendGroupMessage", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session requred.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber requred.");
    if (!req.body.textMessage) return res.status(400).json("textMessage requred.");

    let client = clientArray[req.params.session];

    if (client != undefined) {
        if (await client.getConnectionState() == "CONNECTED") {

            await client
                .sendText(req.body.phoneNumber, req.body.textMessage)
                .then((result) => {
                    return res.json(result); //return object success
                })
                .catch((e) => {
                    return res.status(400).json({ message: e }); //return object error
                });
        }
        else {
            return res.status(400).json("notLogged.");
        }
    }
    else {
        return res.status(400).json("notLogged.");
    }

});

router.post("/:session/checkReply", async function (req, res) {
    let client = clientArray[req.params.session];

    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber requred.");

    if (client != null) {

        if (await client.getConnectionState() == "CONNECTED") {

            //let response = await client.checkNumberStatus(req.body.phoneNumber)

            //let response = await client.getChatById(req.body.phoneNumber + '@c.us')

            const GetMessagesParam = {
                count: 10,
                direction: null,
                fromMe: false,
                id: null
            }

            let response = await client.getMessages(req.body.phoneNumber + '@c.us', GetMessagesParam);

            var message = '';

            if (response.find(e => e.fromMe === false)) {
                /* same result as above, but a different function return type */
                message = 'isReply';
            }

            return res.json({
                message: message
            });

            //await client
            //    .getAllMessagesInChat(req.body.phoneNumber + '@c.us', true, true)
            //    .then((result) => {
            //        return result; //return object success
            //    })
            //    .catch((e) => {
            //        return res.status(400).json({ message: e }); //return object error
            //    });

            //response = await client.getAllGroups(true);

            //response = await client.getChat(req.body.phoneNumber + '@c.us')

            //clientArray[req.params.session] = undefined;

            //await client.logout();

            //callWebHook(client, req, 'status-find', { status: 'logout' });

        }
    }
    else {
        return res.status(400).json("notLogged.");
    }
});

router.post("/:session/sendMessage", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session requred.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber requred.");
    if (!req.body.textMessage) return res.status(400).json("textMessage requred.");

    let client = clientArray[req.params.session];

    if (client != undefined) {
        if (await client.getConnectionState() == "CONNECTED") {
            await client
                .sendText(req.body.phoneNumber + '@c.us', req.body.textMessage)
                .then((result) => {
                    return res.json(result); //return object success
                })
                .catch((e) => {
                    return res.status(400).json({ message: e }); //return object error
                });
        }
        else {
            return res.status(400).json("notLogged.");
        }
    }
    else {
        return res.status(400).json("notLogged.");
    }

});

router.post("/:session/sendImage", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session requred.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber requred.");
    if (!req.body.imageString) return res.status(400).json("image requred.");
    if (!req.body.imageName) return res.status(400).json("image requred.");

    let client = clientArray[req.params.session];

    if (client != undefined) {
        if (await client.getConnectionState() == "CONNECTED") {
            await client
                .sendImage(
                    req.body.phoneNumber + '@c.us',
                    req.body.imageString,
                    req.body.imageName,
                    req.body.imageCaption
                )
                .then((result) => {
                    return res.json(result); //return object success
                })
                .catch((e) => {
                    return res.status(400).json({ message: e }); //return object error
                });

        }
        else {
            return res.status(400).json("notLogged.");
        }
    }
    else {
        return res.status(400).json("notLogged.");
    }

});

router.post("/:session/sendLink", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session requred.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber requred.");
    if (!req.body.linkString) return res.status(400).json("image requred.");

    let client = clientArray[req.params.session];

    if (client != undefined) {
        if (await client.getConnectionState() == "CONNECTED") {
            await client
                .sendLinkPreview(
                    req.body.phoneNumber + '@c.us',
                    req.body.linkString,
                    req.body.linkTitle
                )
                .then((result) => {
                    return res.json(result); //return object success
                })
                .catch((e) => {
                    return res.status(400).json({ message: e }); //return object error
                });

        }
        else {
            return res.status(400).json("notLogged.");
        }
    }
    else {
        return res.status(400).json("notLogged.");
    }

});

router.post("/:session/sendFile", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session requred.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber requred.");
    if (!req.body.fileString) return res.status(400).json("file requred.");

    let client = clientArray[req.params.session];

    if (client != undefined) {
        if (await client.getConnectionState() == "CONNECTED") {
            await client
                .sendFile(
                    req.body.phoneNumber + '@c.us',
                    req.body.fileString,
                    req.body.fileName,
                    req.body.fileCaption
                )
                .then((result) => {
                    return res.json(result); //return object success
                })
                .catch((e) => {
                    return res.status(400).json({ message: e }); //return object error
                });

        }
        else {
            return res.status(400).json("notLogged.");
        }
    }
    else {
        return res.status(400).json("notLogged.");
    }

});

router.post("/:session/sendButton", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session required.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber required.");
    if (!req.body.textMessage) return res.status(400).json("textMessage requred.");
    if (!req.body.buttons) return res.status(400).json("button required.");

    let client = clientArray[req.params.session];

    if (req.body.reply) {
        Array.prototype.push.apply(replyMessage, JSON.parse(req.body.reply));

        replyMessage = replyMessage.filter((v, i, a) => a.findIndex(v2 => (v2.id === v.id)) === i)
    }

    if (client != undefined) {
        if (await client.getConnectionState() == "CONNECTED") {
            client.sendText(
                req.body.phoneNumber + '@c.us',
                req.body.textMessage,
                {
                    useTemplateButtons: true, // False for legacy
                    buttons: JSON.parse(req.body.buttons),
                    /*[
                    {
                        url: 'https://wppconnect.io/',
                        text: 'WPPConnect Site'
                    },
                    {
                        phoneNumber: '+60107072567',
                        text: 'Call me'
                    },
                    {
                        text : 'Some text',
                        id: 'id-123'
                    },
                    {
                        id: 'another id 2',
                        text: 'Another text',
                        type: 'template'
                    }
                ],*/
                    //title: 'Title text' ,// Optional
                    //footer: 'Footer text' // Optional
                }
            )
                .then((result) => {
                    return res.json(result); //return object success
                })
                .catch((e) => {
                    return res.status(400).json({ message: e }); //return object error
                });;
        }
        else {
            return res.status(400).json("notLogged.");
        }
    }
    else {
        return res.status(400).json("notLogged.");
    }

});

router.post("/:session/checkNumberStatus", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session requred.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber requred.");

    let client = clientArray[req.params.session];
    console.log(client);
    if (client != undefined) {
        try {
            if (await client.getConnectionState() == "CONNECTED") {
                await client
                    .checkNumberStatus(req.body.phoneNumber + '@c.us')
                    .then((result) => {
                        return res.json(result); //return object success
                    })
                    .catch((e) => {
                        return res.status(400).json({ message: e }); //return object error
                    });
            }
            else {
                return res.status(400).json("notLogged.");
            }
        } catch (e) {
            return res.status(400).json("notLogged.");
        }

    }
    else {
        return res.status(400).json("notLogged.");
    }
});

router.post("/:session/checkProfilePicFromServer", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session requred.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber requred.");

    let client = clientArray[req.params.session];
    console.log(client);
    if (client != undefined) {
        try {
            if (await client.getConnectionState() == "CONNECTED") {
                await client
                    .getProfilePicFromServer(req.body.phoneNumber + '@c.us')
                    .then((result) => {
                        return res.json(result); //return object success
                    })
                    .catch((e) => {
                        return res.status(400).json({ message: e }); //return object error
                    });
            }
            else {
                return res.status(400).json("notLogged.");
            }
        } catch (e) {
            return res.status(400).json("notLogged.");
        }

    }
    else {
        return res.status(400).json("notLogged.");
    }
});

router.post("/:session/checkContact", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session requred.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber requred.");

    let client = clientArray[req.params.session];
    console.log(client);
    if (client != undefined) {
        try {
            if (await client.getConnectionState() == "CONNECTED") {
                await client
                    .getContact(req.body.phoneNumber + '@c.us')
                    .then((result) => {
                        return res.json(result); //return object success
                    })
                    .catch((e) => {
                        return res.status(400).json({ message: e }); //return object error
                    });
            }
            else {
                return res.status(400).json("notLogged.");
            }
        } catch (e) {
            return res.status(400).json("notLogged.");
        }

    }
    else {
        return res.status(400).json("notLogged.");
    }
});

router.post("/:session/checkNumberProfile", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session requred.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber requred.");

    let client = clientArray[req.params.session];
    console.log(client);
    if (client != undefined) {
        try {
            if (await client.getConnectionState() == "CONNECTED") {
                await client
                    .getNumberProfile(req.body.phoneNumber + '@c.us')
                    .then((result) => {
                        return res.json(result); //return object success
                    })
                    .catch((e) => {
                        return res.status(400).json({ message: e }); //return object error
                    });
            }
            else {
                return res.status(400).json("notLogged.");
            }
        } catch (e) {
            return res.status(400).json("notLogged.");
        }

    }
    else {
        return res.status(400).json("notLogged.");
    }
});

router.post("/:session/sendButtonMessage", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session requred.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber requred.");
    if (!req.body.textMessage) return res.status(400).json("textMessage requred.");

    let client = clientArray[req.params.session];

    if (client != undefined) {
        if (await client.getConnectionState() == "CONNECTED") {
            await client
                .sendText(req.body.phoneNumber + '@c.us', req.body.textMessage, {
                    useTemplateButtons: true, // False for legacy
                    buttons: [
                        //{
                        //    url: 'https://property213.io/',
                        //    text: 'Property 213 Site'
                        //},
                        //{
                        //    phoneNumber: '+60169935772',
                        //    text: 'Call me'
                        //},
                        {
                            id: 'Button1',
                            text: '-Pending Commission'
                        },
                        {
                            id: 'Button2',
                            text: '-Gala Ranking'
                        },
                        {
                            id: 'Button3',
                            text: '-Unclaim Commission'
                        } //max 3 button only
                    ]
                })
                .then((result) => {
                    return res.json(result); //return object success
                })
                .catch((e) => {
                    return res.status(400).json({ message: e }); //return object error
                });
        }
        else {
            return res.status(400).json("notLogged.");
        }
    }
    else {
        return res.status(400).json("notLogged.");
    }
})

router.get("/:session/channelConnect", async function (req, res) {
    let client = clientArray[req.params.session];

    if (browserSession[req.params.session] != null) {

        if (clientArray[req.params.session] != null) {

            return res.json({
                message: {
                    status: 'isLogged'
                }
            });

            /*return res.json({
                message: {
                    status: 'isLogged',
                    phone: await client.getWid(),
                    picture: await client.getProfilePicFromServer(phoneNumber)
                }
            });*/

        } else {

            await browserSession[req.params.session].wppconnect;

            return res.json({
                message: browserSession[req.params.session]
            });
        }
    } else {

        browserSession[req.params.session] = {
            status: "waitForLogin",
            wppconnect: wppconnect.create({
                //session
                session: req.params.session, //Pass the name of the client you want to start the bot
                //catchQR
                catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => {
                    browserSession[req.params.session] = { status: "waitForLogin", qrcode: base64Qrimg };
                    callChannelWebHook(client, req, 'qrcode', { qrcode: base64Qrimg, urlcode: urlCode });

                    return res.json({
                        message: browserSession[req.params.session]
                    });
                },
                statusFind: (statusSession, session) => {

                    if (clientArray[req.params.session] != null && statusSession == "notLogged") {
                        var client = clientArray[req.params.session];

                        clientArray[session] = undefined;

                        if (browserSession[req.params.session] != null) {
                            browserSession[session] = { status: statusSession };
                        }

                        client.close();
                    }

                    try {
                        if (statusSession === 'autocloseCalled' || statusSession === 'desconnectedMobile' || statusSession === 'browserClose') {
                            var client = clientArray[req.params.session];
                            var browser = browserSession[req.params.session];

                            if (client != null) {
                                clientArray[session] = undefined;
                                client.close();
                            }

                            if (browser != null) {

                                if (statusSession == 'desconnectedMobile') {
                                    browserSession[session] = {
                                        status: "notLogged"
                                    }
                                } else if (statusSession === 'autocloseCalled' || statusSession === 'browserClose') {
                                    browserSession[session] = undefined;
                                }
                            }
                        }

                        if (statusSession == 'isLogged') {
                            if (clientArray[req.params.session] != null) {
                                callChannelWebHook(clientArray[req.params.session], req, 'status-find', { status: statusSession });
                            }
                        } else if (statusSession == 'inChat') {
                            if (clientArray[req.params.session].waitForInChat()) {
                                callChannelWebHook(clientArray[req.params.session], req, 'status-find', { status: statusSession });
                            }
                        } else {
                            callChannelWebHook(clientArray[req.params.session], req, 'status-find', { status: statusSession });
                        }

                    } catch (error) { }
                },
                headless: true, // Headless chrome
                devtools: false, // Open devtools by default
                useChrome: true, // If false will use Chromium instance
                debug: false, // Opens a debug session
                logQR: true, // Logs QR automatically in terminal
                browserWS: '', // If u want to use browserWSEndpoint
                browserArgs: ['--js-flags="--max_old_space_size=80" --disable-web-security', '--no-sandbox', '--disable-web-security', '--aggressive-cache-discard', '--disable-cache', '--disable-application-cache', '--disable-offline-load-stale-cache', '--disk-cache-size=0', '--disable-background-networking', '--disable-default-apps', '--disable-extensions', '--disable-sync', '--disable-translate', '--hide-scrollbars', '--metrics-recording-only', '--mute-audio', '--no-first-run', '--safebrowsing-disable-auto-update', '--ignore-certificate-errors', '--ignore-ssl-errors', '--ignore-certificate-errors-spki-list'], // Parameters to be added into the chrome browser instance
                //browserArgs: [''], // Parameters to be added into the chrome browser instance
                puppeteerOptions: {
                    userDataDir: './tokens/' + req.params.session, // or your custom directory
                }, // Will be passed to puppeteer.launch
                disableWelcome: true, // Option to disable the welcoming message which appears in the beginning
                updatesLog: true, // Logs info updates automatically in terminal
                autoClose: 60000, // Automatically closes the wppconnect only when scanning the QR code (default 60 seconds, if you want to turn it off, assign 0 or false)
                tokenStore: 'file', // Define how work with tokens, that can be a custom interface
                folderNameToken: './tokens', //folder name when saving tokens
            }).then(async function (client) {
                clientArray[req.params.session] = client;
                browserSession[req.params.session] = { status: "isLogged" };

                await listenMessages(client, req);
                //await listenAcks(client, req);

                callChannelWebHook(client, req, 'status-find', { status: 'isLogged' });

                return res.json({
                    message: browserSession[req.params.session]
                });

            }).catch((e) => {
                return null;
            })
        };
    }
});

router.post("/:session/sendWhatsappMessage", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session requred.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber requred.");
    if (!req.body.messageType) return res.status(400).json("messageType requred.");

    var messageType = req.body.messageType;

    let client = clientArray[req.params.session];

    Object.assign(browserSession[req.params.session], {
        pauseListen: true
    });

    if (client != undefined) {
        if (await client.getConnectionState() != "CONNECTED") {
            return res.status(400).json("notLogged.");
        }
    }
    else {
        return res.status(400).json("notLogged.");
    }

    switch (messageType) {
        case 'text':
            if (!req.body.textMessage) {
                return res.status(400).json("textMessage requred.");
                break;
            }
            await client
                .sendText(req.body.phoneNumber + '@c.us', req.body.textMessage)
                .then((result) => {
                    return res.json(result); //return object success
                })
                .catch((e) => {
                    return res.status(400).json({ message: e }); //return object error
                });
            delete browserSession[req.params.session].pauseListen;
            break;
        case 'image':
            if (!req.body.imageString) {
                return res.status(400).json("image requred.");
                break;
            } else if (!req.body.imageName) {
                return res.status(400).json("imageName requred.");
                break;
            }
            await client
                .sendImage(
                    req.body.phoneNumber + '@c.us',
                    req.body.imageString,
                    req.body.imageName,
                    req.body.imageCaption
                )
                .then((result) => {
                    return res.json(result); //return object success
                })
                .catch((e) => {
                    return res.status(400).json({ message: e }); //return object error
                });
            delete browserSession[req.params.session].pauseListen;
            break;
        case 'link':
            if (!req.body.linkString) {
                return res.status(400).json("link requred.");
                break;
            }
            await client
                .sendLinkPreview(
                    req.body.phoneNumber + '@c.us',
                    req.body.linkString,
                    req.body.linkTitle
                )
                .then((result) => {
                    return res.json(result); //return object success
                })
                .catch((e) => {
                    return res.status(400).json({ message: e }); //return object error
                });
            delete browserSession[req.params.session].pauseListen;
            break;
        case 'file':
            if (!req.body.fileString) {
                return res.status(400).json("file requred.");
                break;
            }
            await client
                .sendFile(
                    req.body.phoneNumber + '@c.us',
                    req.body.fileString,
                    req.body.fileName,
                    req.body.fileCaption
                )
                .then((result) => {
                    return res.json(result); //return object success
                })
                .catch((e) => {
                    return res.status(400).json({ message: e }); //return object error
                });
            delete browserSession[req.params.session].pauseListen;
            break;
        case 'button':
            if (!req.body.textMessage) {
                return res.status(400).json("textMessage requred.");
                break;
            } else if (!req.body.buttons) {
                return res.status(400).json("button required.");
                break;
            }

            if (req.body.reply) {
                Array.prototype.push.apply(replyMessage, JSON.parse(req.body.reply));

                replyMessage = replyMessage.filter((v, i, a) => a.findIndex(v2 => (v2.id === v.id)) === i)
            }
            await client
                .sendText(
                    req.body.phoneNumber + '@c.us',
                    req.body.textMessage,
                    {
                        useTemplateButtons: true, // False for legacy
                        buttons: JSON.parse(req.body.buttons)
                    }
                )
                .then((result) => {
                    return res.json(result); //return object success
                })
                .catch((e) => {
                    return res.status(400).json({ message: e }); //return object error
                });
            delete browserSession[req.params.session].pauseListen;
            break;

        default:
            console.log(`Received message of unknown type ${message.type}: ${message.body}`);
            break;

    }
});

router.get("/:session/getWhatsappProfile", async function (req, res) {

    let client = clientArray[req.params.session];

    if (client) {

        await getWhatsappInfo(client, req);

        return res.json({
            message: "success"
        });
    }
    else {
        return res.json({
            message: "failed"
        });
    }
});

async function createSession(req, res, listenMessage, sendWebhookResult = callWebHook) {

    let client = clientArray[req.params.session];
    var browser = browserSession[req.params.session];

    try {
        return await wppconnect.create({
            //session
            session: req.params.session, //Pass the name of the client you want to start the bot
            //catchQR
            catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => {
                browserSession[req.params.session] = {
                    status: 'waitForLogin',
                    qrcode: base64Qrimg,
                    wppconnect: 'fullfilled'
                };
                sendWebhookResult(clientArray[req.params.session], req, 'qrcode', { qrcode: base64Qrimg, urlcode: urlCode });
                return res.json({
                    message: browserSession[req.params.session]
                });
            },
            statusFind: async function (statusSession, session) {
                //console.log(`Whatsapp browser session ${session} checking: ${statusSession}`);
                if (statusSession === 'desconnectedMobile') {
                    sendWebhookResult(clientArray[req.params.session], req, 'status-find', { status: 'desconnectedMobile' });
                    //if (clientArray[session]) {
                    //    await clientArray[session].close();
                    //    browserSession[session] = undefined;
                    //}
                    //console.log('Whatsapp desconnectedMobile');
                } else if (statusSession === 'autocloseCalled' || statusSession === 'browserClose') {
                    if (browserSession[session]) {
                        if (('offHook' in browserSession[session]) && browserSession[session].offHook === false) {
                            sendWebhookResult(clientArray[req.params.session], req, 'status-find', { status: statusSession });
                        }
                        //if (!('offHook' in browserSession[session])) {
                        //    sendWebhookResult(clientArray[req.params.session], req, 'status-find', { status: statusSession });
                        //} else {
                        //    if (browserSession[session].offHook === 'false') {
                        //        sendWebhookResult(clientArray[req.params.session], req, 'status-find', { status: statusSession });
                        //    }
                        //} 
                        browserSession[session] = undefined;
                    }
                    //console.log('Whatsapp browserClose');
                } else if (statusSession == 'isLogged') {
                    //if (client != null) {
                    //    sendWebhookResult(client, req, 'status-find', { status: statusSession });
                    //} else {
                    //    sendWebhookResult(client, req, 'status-find', { status: 'notLogged' });
                    //}
                    //console.log('Whatsapp isLogged');
                    sendWebhookResult(clientArray[req.params.session], req, 'status-find', { status: statusSession });
                } else if (statusSession === 'notLogged') {
                    sendWebhookResult(clientArray[req.params.session], req, 'status-find', { status: statusSession });
                } else if (statusSession === 'inChat') {
                    //console.log(`Waiting session ${session} to load complete`);
                    //if (clientArray[session].waitForInChat()) {
                    //    console.log(`Session ${session} load complete`);
                    //    sendWebhookResult(client, req, 'status-find', { status: 'inChat' });
                    //}

                    //await waitForBrowser(clientArray[session]);

                    await clientArray[req.params.session].isMainReady();

                    sendWebhookResult(clientArray[req.params.session], req, 'status-find', { status: 'inChat' });
                    //console.log('Whatsapp inChat');
                } else {
                    sendWebhookResult(clientArray[req.params.session], req, 'status-find', { status: statusSession });
                    //console.log(`Whatsapp ${statusSession}`);
                }
                //isLogged || notLogged || browserClose || qrReadSuccess || qrReadFail || autocloseCalled || desconnectedMobile || deleteToken
            },
            headless: true, // Headless chrome
            devtools: false, // Open devtools by default
            useChrome: true, // If false will use Chromium instance
            debug: false, // Opens a debug session
            logQR: true, // Logs QR automatically in terminal
            browserWS: '', // If u want to use browserWSEndpoint
            browserArgs: ['--js-flags="--max_old_space_size=80" --disable-web-security', '--no-sandbox', '--disable-web-security', '--aggressive-cache-discard', '--disable-cache', '--disable-application-cache', '--disable-offline-load-stale-cache', '--disk-cache-size=0', '--disable-background-networking', '--disable-default-apps', '--disable-extensions', '--disable-sync', '--disable-translate', '--hide-scrollbars', '--metrics-recording-only', '--mute-audio', '--no-first-run', '--safebrowsing-disable-auto-update', '--ignore-certificate-errors', '--ignore-ssl-errors', '--ignore-certificate-errors-spki-list'], // Parameters to be added into the chrome browser instance
            //browserArgs: [''],
            puppeteerOptions: {
                userDataDir: './tokens/' + req.params.session, // or your custom directory
            }, // Will be passed to puppeteer.launch
            disableWelcome: true, // Option to disable the welcoming message which appears in the beginning
            updatesLog: true, // Logs info updates automatically in terminal
            autoClose: 60000, // Automatically closes the wppconnect only when scanning the QR code (default 60 seconds, if you want to turn it off, assign 0 or false)
            tokenStore: 'file', // Define how work with tokens, that can be a custom interface
            folderNameToken: './tokens', //folder name when saving tokens
        }).then(async function (client) {
            clientArray[req.params.session] = client;
            browserSession[req.params.session] = {
                status: 'isLogged',
                wppconnect: 'fullfilled'
            };
            if (listenMessage === true) {
                await listenMessages(client, req);
                await listenAcks(client, req);
            }
            return res.json({
                message: browserSession[req.params.session]
            });
        }).catch((e) => {
            return null;
        });
        //console.log(`Session ${req.params.session} created!`);
        return client;
    } catch (error) {
        //console.log(`Failed to create session ${req.params.session}: ${error}`);
    }
}

async function listenMessages(client, req) {
    //await client.onMessage(async (message) => {
    //    //eventEmitter.emit(`mensagem-${client.session}`, client, message);
    //    callWebHook(client, req, 'onmessage', message);
    //    KeywordReply(client, message);
    //    if (message.type === 'location')
    //        client.onLiveLocation(message.sender.id, (location) => {
    //            callWebHook(client, req, 'location', location);
    //        });
    //    if (message.type === 'template_button_reply')
    //        if (client != undefined) {

    //            //replyMessage = [
    //            //    {
    //            //        received: 'ff', reply: 'ff'
    //            //    },
    //            //    {
    //            //        received: 'dd', reply: 'dd'
    //            //    }
    //            //]

    //            replyMessage.find((msg) => {
    //                if (msg.id.toString() === message.selectedId) {
    //                    client
    //                        .sendText(message.from, msg.reply)
    //                }
    //            });
    //        }
    //});

    //await client.onAnyMessage(async (message) => {
    await client.onAnyMessage(async (message) => {

        if (browserSession[req.params.session].pauseListen) return;

        message.session = client.session;

        var name = ((message.sender.name) != null && (message.sender.name) != '') ? (message.sender.name) : (message.sender.pushname);

        var profilePicture = '';

        var mobileNumber = '';

        var messageSender = '';

        var isMyContact = message.sender.isMyContact;

        if (message.sender.profilePicThumbObj != null) {
            profilePicture = message.sender.profilePicThumbObj.eurl;
        }

        if (message.fromMe == true) {
            mobileNumber = message.to;
            await client.getChatById(message.to)
                .then((chat) => {
                    // Log the name of the chat
                    messageSender = chat.name;
                })
                .catch((error) => {
                    messageSender = name;
                });
        } else {
            mobileNumber = message.from;
            messageSender = name;
        }

        switch (message.type) {
            case 'text':
                if (message.body) {
                    const filename = message.id.toString();

                    if (message.subtype == 'url') {
                        callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'video', message: message.body, description: message.title, thumbnail: message.thumbnail, filename: filename, session: message.session });
                    } else {
                        callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'text', message: message.body, filename: filename, session: message.session });
                    }
                }
                break;
            case 'chat':
                if (message.body) {
                    const filename = message.id.toString();

                    if (message.subtype == 'url') {
                        callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'video', message: message.body, description: message.title, thumbnail: message.thumbnail, filename: filename, session: message.session });
                    } else {
                        callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'text', message: message.body, filename: filename, session: message.session });
                    }
                }
                break;
            case 'ptt':

                const pttMedia = await client.downloadMedia(message);

                if (pttMedia) {
                    const filename = message.id.toString() + '.' + message.mimetype.split('/')[1];

                    callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'audio', message: pttMedia, filename: filename, session: message.session });
                } else {
                    console.log(`Error downloading media for message ${message.id}`);
                }
                break;
            case 'image':

                const imageMedia = await client.downloadMedia(message);

                if (imageMedia) {
                    const filename = message.id.toString() + '.jpg';

                    callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'image', message: imageMedia, filename: `${message.t}.${message.mimetype.split('/')[1]}`, isCaptionByUser: message.isCaptionByUser, caption: message.caption, session: message.session });
                } else {
                    console.log(`Error downloading media for message ${message.id}`);
                }
                break;
            case 'audio':

                const audioMedia = await client.downloadMedia(message);

                if (audioMedia) {
                    const filename = message.id.toString() + '.' + message.mimetype.split('/')[1];

                    callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'audio', message: audioMedia, filename: `${message.t}.${message.mimetype.split('/')[1]}`, isCaptionByUser: message.isCaptionByUser, caption: message.caption, session: message.session });
                } else {
                    console.log(`Error downloading media for message ${message.id}`);
                }
                break;
            case 'video':

                const videoMedia = await client.downloadMedia(message);

                if (videoMedia) {
                    const filename = message.id.toString() + '.' + message.mimetype.split('/')[1];

                    callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'video', message: videoMedia, filename: `${message.t}.${message.mimetype.split('/')[1]}`, isCaptionByUser: message.isCaptionByUser, caption: message.caption, session: message.session });
                } else {
                    console.log(`Error downloading media for message ${message.id}`);
                }
                break;
            case 'document':

                const docMedia = await client.downloadMedia(message);

                if (docMedia) {
                    var filename = message.id.toString() + '.' + message.mimetype.split('/')[1];
                    if ((message.caption) != null && (message.caption != '')) {
                        filename = message.caption
                    }

                    callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'document', message: docMedia, filename: ((message.filename != null && message.filename != '') ? (message.filename) : (`${message.t}.${message.mimetype.split('/')[1]}`)), isCaptionByUser: message.isCaptionByUser, caption: message.caption, session: message.session });
                } else {
                    console.log(`Error downloading media for message ${message.id}`);
                }
                break;
            case 'sticker':

                const stickerMedia = await client.downloadMedia(message);

                if (stickerMedia) {
                    const filename = message.id.toString() + '.' + message.mimetype.split('/')[1];

                    callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'sticker', message: stickerMedia, filename: filename, session: message.session });
                } else {
                    console.log(`Error downloading media for message ${message.id}`);
                }
                break;
            case 'voice':

                const voiceMedia = await client.downloadMedia(message);

                if (voiceMedia) {
                    const filename = message.id.toString() + '.' + message.mimetype.split('/')[1];

                    callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'voice', message: voiceMedia, filename: `${message.t}.${message.mimetype.split('/')[1]}`, session: message.session });
                } else {
                    console.log(`Error downloading media for message ${message.id}`);
                }
                break;
            default:
                console.log(`Received message of unknown type ${message.type}: ${message.body}`);
                break;
        }
    });

    await client.onIncomingCall(async (call) => {
        callWebHook(client, req, 'incomingcall', call);
    });
}

async function listenAcks(client, req) {
    await client.onAck(async (ack) => {
        callWebHook(client, req, 'onack', ack);
    });
}

async function onPresenceChanged(client, req) {
    await client.onPresenceChanged(async (presenceChangedEvent) => {
        callWebHook(client, req, 'onpresencechanged', presenceChangedEvent);
    });
}

async function waitForBrowser(client) {
    console.log('Waiting for browser to load completely...');
    while (!(await client.getConnectionState() == "CONNECTED")) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('Browser is now connected');

    while (!(await client.waitForInChat())) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('All chats are now loaded');

    return 'inChat';
}

async function getWhatsappInfo(client, req) {

    const webhook = req.query.hook || false;

    if (webhook && client != null) {

        await waitForBrowser(clientArray[req.params.session]);

        client = clientArray[req.params.session];

        var phone = await client.getWid();
        var picture = await getProfilePic(client, phone);
        var profile = await getProfileDetails(client, phone);

        var event = 'whatsapp-detail';
        var data = {
            status: 'update',
            mobileNumber: phone,
            profilePicture: picture,
            userName: profile,
            whatsappChannelUId: req.params.session
        }

        if (phone && phone.trim() !== '') {

            const chatId = data.from || data.chatId || (data.chatId ? data.chatId._serialized : null);
            data = Object.assign({ event: event, session: req.params.session }, data);

            api.post((webhook), data).catch((e) => {
                console.log('Error calling Webhook.', e);
            });

            return;
        }

        return getWhatsappInfo(client, req);
    }
}

async function callChannelWebHook(client, req, event, data) {

    const webhook = req.query.hook || false;

    if (webhook) {

        if (client != null && data['status'] == 'inChat') {
            try {
                getWhatsappInfo(client, req);
            } catch (e) { }
        }

        try {
            const chatId = data.from || data.chatId || (data.chatId ? data.chatId._serialized : null);
            data = Object.assign({ event: event, session: req.params.session }, data);

            api.post((webhook), data).catch((e) => {
                console.log('Error calling Webhook.', e);
            });
        } catch (e) {
            console.log(e);
        }

        //if (data['status'] == 'inChat') {

        //    if (client != null) {
        //        try {

        //            if (await client.getConnectionState() == "CONNECTED") {

        //                await waitForBrowser(client);

        //                var phone = await client.getWid();
        //                var picture = await getProfilePic(client, phone);
        //                var profile = await getProfileDetails(client, phone);

        //                data = {
        //                    status: 'inChat',
        //                    mobileNumber: phone,
        //                    profilePicture: picture,
        //                    userName: profile,
        //                    whatsappChannelUId: req.params.session
        //                }
        //            }

        //            const chatId = data.from || data.chatId || (data.chatId ? data.chatId._serialized : null);
        //            data = Object.assign({ event: event, session: req.params.session }, data);

        //            api.post((webhook), data).catch((e) => {
        //                console.log('Error calling Webhook.', e);
        //            });
        //        } catch (e) {
        //            console.log(e);
        //        }
        //    }

        //} else {
        //    try {
        //        const chatId = data.from || data.chatId || (data.chatId ? data.chatId._serialized : null);
        //        data = Object.assign({ event: event, session: req.params.session }, data);

        //        api.post((webhook), data).catch((e) => {
        //            console.log('Error calling Webhook.', e);
        //        });
        //    } catch (e) {
        //        console.log(e);
        //    }
        //}
    }
}

async function callWebHook(client, req, event, data) {
    //const webhook = req.body.webhook || false
    const webhook = req.query.hook || false;

    //console.log(req.params.session, data);

    if (webhook) {
        try {
            const chatId = data.from || data.chatId || (data.chatId ? data.chatId._serialized : null);
            data = Object.assign({ event: event, session: req.params.session }, data);

            api.post((webhook), data).catch((e) => {
                //console.log('Error calling Webhook.', e);
            });
        } catch (e) {
            //console.log(e);
        }
    }
}

async function getProfileDetails(client, phoneNumber, limit = 10) {
    let profileName = '';
    let retries = 0;

    while (!profileName && retries < limit) {
        const response = await client.getContact(phoneNumber);

        if (response.name) {
            profileName = response.name;
        } else {
            retries++;
            // wait for some time before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return profileName;
}

async function getProfilePic(client, phoneNumber, limit = 10) {
    let profilePic = ''
    let retries = 0

    while (!profilePic && retries < limit) {
        const response = await client.getProfilePicFromServer(phoneNumber)

        if (response.eurl) {
            profilePic = response.eurl
        } else {
            retries++
            // wait for some time before retrying
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    }

    return profilePic;
}

async function KeywordReply(client, response) {

    if (response.isGroupMsg == false && response.type == "template_button_reply") {
        var message = "";

        switch (response.body) {
            case "-Pending Commission":
                message = "Your pending case commission is RM 23,384.00";
                break;
            case "-Gala Ranking":
                message = "Your current ranking is No.12, Keep going!";
                break;
            case "-Unclaim Commission":
                message = "Your unclaim commission is RM 11,995.00";
                break;
            case "-Personal GDV":
                message = "Your current personal GDV is RM 1,321,123.00";
                break;
                break;
            case "-Group GDV":
                message = "Your current group GDV is RM 12,890,134.00";
                break;
        }

        if (message != "") {
            if (client != undefined) {
                console.log("status: " + client.getConnectionState());
                if (await client.getConnectionState() == "CONNECTED") {
                    console.log("sender: " + response.sender.id);
                    await client
                        .sendText(response.sender.id, message);
                }
            }
        }

    }
}

app.use(apiRoot, router);

app.listen(port, () => {
    console.log("Server up!");
});
