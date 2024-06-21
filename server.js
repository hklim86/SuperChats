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

const { executablePath } = require('puppeteer');

const app = express();
var clientArray = [];

var browserSession = [];
var sessionToken = [];
const timeoutLimit = 3000; // 60 seconds

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors({ origin: /http:\/\/194.233.79.27/ }));
app.options("*", cors());

var replyMessage = [];

const router = express.Router();

router.get("/", (req, res) => {
    res.send(executablePath());
});

router.put("/:session/check", async function (req, res) {
    let action = req.body.action || false;
    let control = req.body.control || false;

    if (action) {
        if (action == "checking") {
            try {
                if (browserSession[req.params.session] && browserSession[req.params.session].wppconnect) {
                    const promiseStatus = typeof browserSession[req.params.session].wppconnect !== 'string' ? 'Pending' : browserSession[req.params.session].wppconnect;

                    return res.json({
                        message: browserSession[req.params.session]
                    });
                } else {
                    return res.json({
                        message: 'Whatsapp browser not opened'
                    });
                }
            } catch (error) {
                return res.json({
                    message: `Failed to check: ${error}`
                });
            }
        } else if (action == "control") {
            if (control) {
                if (control == "closeClient") {

                    try {
                        if (clientArray[req.params.session]) {
                            try {
                                await clientArray[req.params.session].close();
                            } catch (error) { }

                            try {
                                delete browserSession[req.params.session];
                            } catch (error) { }

                            try {
                                delete clientArray[req.params.session];
                            } catch (error) { }

                            return res.json({
                                message: 'WhatsApp client closed successfully'
                            });
                        } else {
                            return res.json({
                                message: 'Client not open'
                            });
                        }
                    } catch (error) {
                        return res.json({
                            message: `Failed to close client: ${error}`
                        });
                    }
                } else if (control == "deleteBrowser") {
                    try {
                        if (browserSession[res.params.session]) {
                            delete browserSession[res.params.session];

                            return res.json({
                                message: 'WhatsApp browser closed successfully'
                            });
                        } else {
                            return res.json({
                                message: 'Client browser not opened'
                            });
                        }
                    } catch (error) {
                        return res.json({
                            message: `Failed to close WhatsApp browser: ${error}`
                        });
                    }
                } else if (control == "deleteClient") {
                    try {
                        if (clientArray[res.params.session]) {
                            delete clientArray[res.params.session];

                            return res.json({
                                message: 'WhatsApp client deleted successfully'
                            });
                        } else {
                            return res.json({
                                message: 'Client is not exist'
                            });
                        }
                    } catch (error) {
                        return res.json({
                            message: `Failed to delete client: ${error}`
                        });
                    }
                }
            }
        }
    }
});

router.get("/:session/connect_v1", async function (req, res) {
    let client = clientArray[req.params.session];
    let browser = browserSession[req.params.session];

    let isChannel = (req.query.isChannel) == 'true' ? true : false;
    let listenMessage = (req.query.listenMessage) == 'false' ? false : true;

    try {
        if (browserSession[req.params.session] && browserSession[req.params.session].wppconnect) {
            const promiseStatus = typeof browserSession[req.params.session].wppconnect !== 'string' ? 'Pending' : browserSession[req.params.session].wppconnect;

            if (promiseStatus === 'Pending') {
                await browserSession[req.params.session].wppconnect;
            }
        } else {
            browserSession[req.params.session] = {
                status: "waitForLogin",
                wppconnect: createSession(req, res, listenMessage, isChannel, (isChannel === true ? callChannelWebHook : callWebHook))
            };

            if (browserSession[req.params.session]) {
                await browserSession[req.params.session].wppconnect;
            }
        }

        return res.json({
            message: browserSession[req.params.session]
        });
    } catch (error) {
        res.status(500).json({ error: "An error occurred." });
    }
});

router.get("/:session/disconnect", async function (req, res) {
    try {
        if (clientArray[req.params.session]) {
            try {
                await clientArray[req.params.session].logout();
            } catch (error) { }

            try {
                await clientArray[req.params.session].close();
            } catch (error) { }

            return res.json({
                message: "logout"
            });
        } else {
            return res.json({
                message: "notLogged"
            });
        }
    } catch (error) {
        return res.json({
            message: error.toString()
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
    let offHook = (req.query.offHook) == 'true' ? true : false;

    if (clientArray[req.params.session] != null) {

        clientArray[req.params.session].close();

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

            let response = await client.getAllGroups()

            for (const c of response) {
                const subject = c.groupMetadata.subject;
                const id = c.groupMetadata.id._serialized;

                console.log(subject);
            }

            return res.json({
                message: response['message']
            });
        }
    }
});

router.post("/:session/sendGroupMessage", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session required.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber required.");
    if (!req.body.textMessage) return res.status(400).json("textMessage required.");

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

    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber required.");

    if (client != null) {

        if (await client.getConnectionState() == "CONNECTED") {
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
        }
    }
    else {
        return res.status(400).json("notLogged.");
    }
});

router.post("/:session/sendMessage", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session required.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber required.");
    if (!req.body.textMessage) return res.status(400).json("textMessage required.");

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
    if (!req.params.session) return res.status(400).json("Session required.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber required.");
    if (!req.body.imageString) return res.status(400).json("image required.");
    if (!req.body.imageName) return res.status(400).json("image required.");

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
    if (!req.params.session) return res.status(400).json("Session required.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber required.");
    if (!req.body.linkString) return res.status(400).json("image required.");

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
    if (!req.params.session) return res.status(400).json("Session required.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber required.");
    if (!req.body.fileString) return res.status(400).json("file required.");

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

router.post("/:session/checkNumberStatus", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session required.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber required.");

    try {
        let client = clientArray[req.params.session];

        if (client != undefined) {
            if (await client.getConnectionState() != "CONNECTED") {
                return res.status(400).json("notLogged.");
            }
        }
        else {
            return res.status(400).json("notLogged.");
        }

        await client
            .checkNumberStatus(req.body.phoneNumber + '@c.us')
            .then((result) => {
                if (result.numberExists) {
                    return res.json('Online');
                } else {
                    return res.json('Offline');
                }
            })
            .catch((e) => {
                return res.status(400).json({ message: e }); //return object error
            });
    } catch (error) {
        return res.status(400).json("notLogged.");
    }
});

router.post("/:session/checkProfilePicFromServer", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session required.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber required.");

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

router.post("/:session/getChatById", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session required.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber required.");

    let client = clientArray[req.params.session];

    if (client != undefined) {
        try {
            if (await client.getConnectionState() == "CONNECTED") {
                await client.getChatById(req.body.phoneNumber + '@c.us').then(async (result) => {
                    return res.json(result);
                }).catch((error) => {
                    return res.status(400).json({ message: e });
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

router.post("/:session/getAllMessagesInChat", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session required.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber required.");

    let client = clientArray[req.params.session];

    const GetMessagesParam = {
        count: 0,
        direction: null,
        fromMe: false,
        id: null
    }

    if (client != undefined) {
        try {
            if (await client.getConnectionState() == "CONNECTED") {
                await client.getMessages(req.body.phoneNumber + '@c.us', true, false).then(async (result) => {
                    return res.json(result);
                }).catch((error) => {
                    return res.status(400).json({ message: e });
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

router.post("/:session/listChats", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session required.");

    let client = clientArray[req.params.session];

    if (client != undefined) {
        try {
            if (await client.getConnectionState() == "CONNECTED") {
                await client.listChats().then(async (result) => {
                    return res.json(result);
                }).catch((error) => {
                    return res.status(400).json({ message: e });
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

router.post("/:session/getMessageById", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session required.");
    if (!req.body.messageId) return res.status(400).json("message id required.");

    let client = clientArray[req.params.session];

    if (client != undefined) {
        try {
            if (await client.getConnectionState() == "CONNECTED") {
                await client.getMessageById(req.body.messageId).then(async (result) => {
                    return res.json(result);
                }).catch((error) => {
                    return res.status(400).json({ message: e });
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

router.post("/:session/getStatus", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session required.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber required.");

    let client = clientArray[req.params.session];
    console.log(client);
    if (client != undefined) {
        try {
            if (await client.getConnectionState() == "CONNECTED") {
                await client
                    .getStatus(req.body.phoneNumber + '@c.us')
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

router.post("/:session/sendWhatsappMessage", async function (req, res) {
    if (!req.params.session) return res.status(400).json("Session required.");
    if (!req.body.phoneNumber) return res.status(400).json("phoneNumber required.");
    if (!req.body.messageType) return res.status(400).json("messageType required.");

    var messageType = req.body.messageType;
    var messageSalesGpt = req.body.salesGpt;

    try {
        if (browserSession[req.params.session] && browserSession[req.params.session].ischannel == false) {
            if (clientArray[req.params.session] != undefined) {
                while (browserSession[req.params.session].wppconnect != "Completed") {
                    if (!browserSession[req.params.session] || !clientArray[req.params.session]) {
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            else {
                return res.status(400).json("notLogged.");
            }
        }

        try {
            var isChatInContact = false;

            await clientArray[req.params.session].getChatById(req.body.phoneNumber + '@c.us')
                .then((result) => {
                    if (result) {
                        isChatInContact = true
                    }
                })
                .catch((error) => { });

            if (isChatInContact == true) {
                await clientArray[req.params.session].startTyping(req.body.phoneNumber + '@c.us', 2000);
            }
        } catch (error) { }

        switch (messageType) {
            case 'text':
                if (!req.body.textMessage) {
                    return res.status(400).json("textMessage required.");
                    break;
                }
                await clientArray[req.params.session]
                    .sendText(req.body.phoneNumber + '@c.us', req.body.textMessage)
                    .then((result) => {
                        if (messageSalesGpt == 'true') {
                            callWebHook(clientArray[req.params.session], req, 'labelmessage', { messageId: result.id });
                        }

                        return res.json(result); //return object success
                    })
                    .catch((e) => {
                        return res.status(400).json({ message: e }); //return object error
                    });
                break;
            case 'image':
                if (!req.body.imageString) {
                    return res.status(400).json("image required.");
                    break;
                } else if (!req.body.imageName) {
                    return res.status(400).json("imageName required.");
                    break;
                }
                await clientArray[req.params.session]
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
                break;
            case 'link':
                if (!req.body.linkString) {
                    return res.status(400).json("link required.");
                    break;
                }
                await clientArray[req.params.session]
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
                break;
            case 'file':
                if (!req.body.fileString) {
                    return res.status(400).json("file required.");
                    break;
                }
                await clientArray[req.params.session]
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
                break;
            case 'button':
                if (!req.body.textMessage) {
                    return res.status(400).json("textMessage required.");
                    break;
                } else if (!req.body.buttons) {
                    return res.status(400).json("button required.");
                    break;
                }

                await clientArray[req.params.session]
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
                break;
            case 'pool':
                if (!req.body.poolMessage) {
                    return res.status(400).json("pool required.");
                    break;
                } else if (!req.body.poolName) {
                    return res.status(400).json("pool name required.");
                    break;
                }

                await clientArray[req.params.session]
                    .sendPollMessage(
                        req.body.phoneNumber + '@c.us',
                        req.body.poolName,
                        JSON.parse(req.body.poolMessage),
                        {
                            selectableCount: 1,
                        }
                    )
                    .then((result) => {
                        return res.json(result); //return object success
                    })
                    .catch((e) => {
                        return res.status(400).json({ message: e }); //return object error
                    });
                break;
            default:
                break;
        }
    } catch (error) {
        return res.status(400).json("notLogged.");
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

async function createSession(req, res, listenMessage, isChannel, sendWebhookResult = callWebHook) {
    try {
        return await wppconnect.create({
            session: req.params.session,
            catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => {
                browserSession[req.params.session] = {
                    status: 'waitForLogin',
                    qrcode: base64Qrimg,
                    wppconnect: 'fullfilled',
                    ischannel: isChannel
                };

                try {
                    sendWebhookResult(clientArray[req.params.session], req, 'qrcode', { qrcode: base64Qrimg, urlcode: urlCode });
                } catch (e) { }

                return res.json({
                    message: browserSession[req.params.session]
                });
            },
            statusFind: async function (statusSession, session) {
                if (statusSession === 'desconnectedMobile') {
                    try {
                        sendWebhookResult(clientArray[session], req, 'status-find', { status: 'desconnectedMobile' });
                    } catch (e) { }
                } else if (statusSession === 'autocloseCalled' || statusSession === 'browserClose') {
                    try {
                        delete browserSession[session];
                    } catch (e) { }

                    try {
                        sendWebhookResult(clientArray[session], req, 'status-find', { status: statusSession });
                    } catch (e) { }
                } else if (statusSession == 'isLogged') {
                    try {
                        sendWebhookResult(clientArray[session], req, 'status-find', { status: statusSession });
                    } catch (e) { }
                } else if (statusSession === 'notLogged') {
                    try {
                        sendWebhookResult(clientArray[session], req, 'status-find', { status: statusSession });
                    } catch (e) { }
                } else if (statusSession === 'inChat') {
                    try {
                        if (browserSession[session]) {
                            browserSession[session].wppconnect = "Completed";
                        }
                    } catch (e) { }

                    try {
                        sendWebhookResult(clientArray[session], req, 'status-find', { status: 'inChat' });
                    } catch (e) { }
                } else {
                    try {
                        sendWebhookResult(clientArray[session], req, 'status-find', { status: statusSession });
                    } catch (e) { }
                }
            },
            headless: true, // Headless chrome
            devtools: false, // Open devtools by default
            useChrome: true, // If false will use Chromium instance
            debug: false, // Opens a debug session
            logQR: true, // Logs QR automatically in terminal
            browserWS: '', // If u want to use browserWSEndpoint
            browserArgs: ['--js-flags="--max_old_space_size=80" --disable-web-security', '--no-sandbox', '--disable-web-security', '--aggressive-cache-discard', '--disable-cache', '--disable-application-cache', '--disable-offline-load-stale-cache', '--disk-cache-size=0', '--disable-background-networking', '--disable-default-apps', '--disable-extensions', '--disable-sync', '--disable-translate', '--hide-scrollbars', '--metrics-recording-only', '--mute-audio', '--no-first-run', '--safebrowsing-disable-auto-update', '--ignore-certificate-errors', '--ignore-ssl-errors', '--ignore-certificate-errors-spki-list'], // Parameters to be added into the chrome browser instance  
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

            if (browserSession[req.params.session]) {
                browserSession[req.params.session] = {
                    status: 'isLogged',
                    wppconnect: 'fullfilled',
                    ischannel: isChannel
                };
            }

            await clientArray[req.params.session].setOnlinePresence(false);

            if (listenMessage === true) {
                try {
                    await listenMessages(client, req);
                    await listenAcks(client, req);
                    await onRevokedMessage(client, req);
                    await onPollResponse(client, req);
                } catch (e) { }
            }

            if (isChannel === true) {
                client.startPhoneWatchdog();
            }

            return client;
        }).catch((e) => {
            return null;
        });
    } catch (error) { }
}

async function listenMessages(client, req) {
    try {
        await client.onAnyMessage(async (message) => {
            message.session = client.session;

            var name = '';
            var profilePicture = '';
            var mobileNumber = '';
            var messageSender = '';
            var isMyContact = false;
            var filename = '';
            var isCaptionByUser = false;

            try {
                if (message) {
                    if (message.sender && message.fromMe == false) {
                        if (message.sender.name) {
                            messageSender = message.sender.name;
                        } else if (message.sender.pushname) {
                            messageSender = message.sender.pushname;
                        }
                    } else if (message.notifyName && message.fromMe == false) {
                        messageSender = message.notifyName;
                    }
                }
            } catch (e) {
                messageSender = '';
            }

            try {
                if (message.sender.profilePicThumbObj != null) {
                    profilePicture = message.sender.profilePicThumbObj.eurl;
                }
            } catch (e) {
                profilePicture = '';
            }

            try {
                if (message.fromMe == true) {
                    mobileNumber = message.to;
                } else {
                    mobileNumber = message.from;
                }
            } catch (e) {
                mobileNumber = '';
            }

            try {
                if (!messageSender) {
                    await client.getChatById(mobileNumber)
                        .then((result) => {
                            if (result) {
                                if (result.contact) {
                                    if (result.contact.pushname) {
                                        messageSender = result.contact.pushname
                                    }
                                }
                            }
                        })
                        .catch((error) => { });
                }
            } catch (e) { }

            try {
                isMyContact = message.sender.isMyContact;
            } catch (e) {
                isMyContact = false;
            }

            try {
                filename = message.id.toString();
            } catch (e) {
                filename = '';
            }

            try {
                isCaptionByUser = message.isCaptionByUser;
            } catch (e) {
                isCaptionByUser = false;
            }

            switch (message.type) {
                case 'text':
                    if (message.body) {
                        try {
                            if (message.subtype == 'url') {
                                callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'video', message: message.body, description: message.title, thumbnail: message.thumbnail, filename: filename, session: message.session, timeStamp: message.timestamp, messageId: message.id });
                            } else {
                                callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'text', message: message.body, filename: filename, session: message.session, timeStamp: message.timestamp, messageId: message.id });
                            }
                        } catch (e) {
                            callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'text', message: message.body, filename: filename, session: message.session, timeStamp: message.timestamp, messageId: message.id });
                        }
                    }

                    break;
                case 'chat':
                    if (message.body) {
                        try {
                            if (message.subtype == 'url') {
                                callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'video', message: message.body, description: message.title, thumbnail: message.thumbnail, filename: filename, session: message.session, timeStamp: message.timestamp, messageId: message.id });
                            } else {
                                callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'text', message: message.body, filename: filename, session: message.session, timeStamp: message.timestamp, messageId: message.id });
                            }
                        } catch (e) {
                            callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'text', message: message.body, filename: filename, session: message.session, timeStamp: message.timestamp, messageId: message.id });
                        }
                    }
                    break;
                case 'ciphertext':
                    if (message.body) {
                        try {
                            if (message.subtype == 'url') {
                                callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'video', message: message.body, description: message.title, thumbnail: message.thumbnail, filename: filename, session: message.session, timeStamp: message.timestamp, messageId: message.id });
                            } else {
                                callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'text', message: message.body, filename: filename, session: message.session, timeStamp: message.timestamp, messageId: message.id });
                            }
                        } catch (e) {
                            callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'text', message: message.body, filename: filename, session: message.session, timeStamp: message.timestamp, messageId: message.id });
                        }
                    }
                    break;
                case 'ptt':
                    var pttMedia = '';

                    try {
                        pttMedia = await client.downloadMedia(message);
                    } catch (e) {
                        pttMedia = '';
                    }

                    try {
                        filename = message.id.toString() + '.' + message.mimetype.split('/')[1];
                    } catch (e) { }

                    callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'audio', message: pttMedia, filename: filename, session: message.session, timeStamp: message.timestamp, messageId: message.id });

                    break;
                case 'image':
                    var imageMedia = '';

                    try {
                        imageMedia = await client.downloadMedia(message);
                    } catch (e) {
                        imageMedia = '';
                    }

                    try {
                        filename = `${message.t}.${message.mimetype.split('/')[1]}`;
                    } catch (e) {
                        filename = filename + '.jpg';
                    }

                    try {
                        isCaptionByUser = (message.caption == undefined ? false : true);
                    } catch (e) { }

                    callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'image', message: imageMedia, filename: filename, isCaptionByUser: isCaptionByUser, caption: message.caption, session: message.session, timeStamp: message.timestamp, messageId: message.id });

                    break;
                case 'audio':
                    var audioMedia = '';

                    try {
                        audioMedia = await client.downloadMedia(message);
                    } catch (e) {
                        audioMedia = '';
                    }

                    try {
                        filename = `${message.t}.${message.mimetype.split('/')[1]}`;
                    } catch (e) { }

                    try {
                        isCaptionByUser = (message.caption == undefined ? false : true);
                    } catch (e) { }

                    callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'audio', message: audioMedia, filename: filename, isCaptionByUser: isCaptionByUser, caption: message.caption, session: message.session, timeStamp: message.timestamp, messageId: message.id });

                    break;
                case 'video':
                    var videoMedia = '';

                    try {
                        videoMedia = await client.downloadMedia(message);
                    } catch (e) {
                        videoMedia = '';
                    }

                    try {
                        filename = `${message.t}.${message.mimetype.split('/')[1]}`;
                    } catch (e) { }

                    try {
                        isCaptionByUser = (message.caption == undefined ? false : true);
                    } catch (e) { }

                    callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'video', message: videoMedia, filename: filename, isCaptionByUser: isCaptionByUser, caption: message.caption, session: message.session, timeStamp: message.timestamp, messageId: message.id });

                    break;
                case 'document':
                    var docMedia = '';

                    try {
                        docMedia = await client.downloadMedia(message);
                    } catch (e) {
                        docMedia = '';
                    }

                    try {
                        dFilename = ((message.filename != null && message.filename != '') ? (message.filename) : (`${message.t}.${message.mimetype.split('/')[1]}`));
                    } catch (e) { }

                    try {
                        isCaptionByUser = (message.caption == undefined ? false : true);
                    } catch (e) { }

                    callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'document', message: docMedia, filename: filename, isCaptionByUser: isCaptionByUser, caption: message.caption, session: message.session, timeStamp: message.timestamp, messageId: message.id });

                    break;
                case 'sticker':
                    var stickerMedia = await client.downloadMedia(message);

                    try {
                        stickerMedia = await client.downloadMedia(message);
                    } catch (e) {
                        stickerMedia = '';
                    }

                    try {
                        filename = message.id.toString() + '.' + message.mimetype.split('/')[1];
                    } catch { }

                    callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'sticker', message: stickerMedia, filename: filename, session: message.session, timeStamp: message.timestamp, messageId: message.id });

                    break;
                case 'voice':
                    var voiceMedia = await client.downloadMedia(message);

                    try {
                        voiceMedia = await client.downloadMedia(message);
                    } catch (e) {
                        voiceMedia = '';
                    }

                    try {
                        filename = `${message.t}.${message.mimetype.split('/')[1]}`;
                    } catch (e) { }

                    callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'voice', message: voiceMedia, filename: filename, session: message.session, timeStamp: message.timestamp, messageId: message.id });

                    break;
                case 'poll_creation':
                    var poll = '';

                    try {
                        poll = JSON.stringify(message.pollOptions);
                    } catch (e) { }

                    callWebHook(client, req, 'onmessage', { from: messageSender, fromMe: message.fromMe, fromContact: isMyContact, mobileNumber: mobileNumber, profilePicture: profilePicture, type: 'pool', message: poll, filename: message.pollName, session: message.session, timeStamp: message.timestamp, messageId: message.id });

                    break;
                default:
                    console.log(`Received message of unknown type ${message.type}: ${message.body}`);
                    break;
            }
        });
    } catch (e) {

    }
}

async function listenAcks(client, req) {
    try {
        await client.onAck(async (result) => {
            callWebHook(client, req, 'onack', result);
        });
    } catch (e) {

    }
}

async function onPresenceChanged(client, req) {
    try {
        await client.onPresenceChanged(async (result) => {
            callWebHook(client, req, 'onpresencechanged', result);
        });
    } catch (e) {

    }
}

async function onPollResponse(client, req) {
    try {
        await client.onPollResponse(async (result) => {

            result.session = client.session;

            callWebHook(client, req, 'onPollResponse', result);
        });
    } catch (e) {

    }
}

async function onRevokedMessage(client, req) {
    try {
        await client.onRevokedMessage(async (result) => {

            result.session = client.session;

            callWebHook(client, req, 'onrevokedmessage', result);
        });
    } catch (e) {

    }
}

async function getWhatsappInfo(client, req) {
    const webhook = req.query.hook || false;

    try {
        if (webhook) {
            client = clientArray[req.params.session];

            if (client != null) {
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
    } catch (e) {

    }
}

async function callChannelWebHook(client, req, event, data) {
    const webhook = req.query.hook || false;

    if (webhook) {
        try {
            const chatId = data.from || data.chatId || (data.chatId ? data.chatId._serialized : null);
            data = Object.assign({ event: event, session: req.params.session }, data);

            api.post((webhook), data).catch((e) => {
                console.log('Error calling Webhook.', e);
            });
        } catch (e) {
            console.log(e);
        }
    }
}

async function callWebHook(client, req, event, data) {
    const webhook = req.query.hook || false;

    if (webhook) {
        try {
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

async function waitForClientLoad(session) {
    try {
        await clientArray[session].waitForLogin();
        console.log(`Client ${session} logged in.`);
        await clientArray[session].waitForInChat();
        console.log(`Client ${session} is in chat.`);
        await clientArray[session].waitForPageLoad();
        console.log(`Client ${session} page loaded completely.`);
        return true; // Return true to indicate success
    } catch (error) {
        console.error(`Error while waiting for client ${session} to load:`, error);
        return false; // Return false to indicate failure
    }
}


app.use(apiRoot, router);

app.listen(port, () => {
    console.log("Server up!");
});