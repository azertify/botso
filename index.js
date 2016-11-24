'use strict'

// Web Setup:

const hostname = process.env.NODE_IP || 'localhost'
const port = process.env.NODE_PORT || 8080

const webserver = require('http').createServer()
const nodeStatic = require('node-static')
const fileserver = new nodeStatic.Server('./public')

// Bot Setup:

const accessToken = process.env.SLACK_TOKEN
if (!accessToken) {
  console.error('No Slack access token')
  process.exit(-1)
}

/*
const verificationToken = process.env.VERIFICATION_TOKEN
if (!verificationToken) {
  console.error('No Slack verification token')
  process.exit(-1)
}
*/

const slack = require('slack')
const escapeStringRegex = require('escape-string-regexp')

const bot = slack.rtm.client()

// Bot Dictionaries:

var messageResponses = [
  {
    trigger: 'hey botso',
    responses: ['wassup', 'this is a test... did it work?']
  },
  {
    trigger: 'morning',
    responses: ['is DC in yet lol']
  },
  {
    trigger: 'machine',
    responses: ['machine? I\'m not a machine! fuck you', 'ay lmao']
  },
  {
    trigger: ':boom:',
    responses: [':airplane::office::office:']
  }
]

var userList = []

// Bot Methods:

const getUserList = () => new Promise((resolve, reject) => {
  slack.users.list({token: accessToken}, (err, data) => {
    if (err) reject(err)
    else {
      resolve(data.members.map(user => {
        return {
          name: user.name,
          id: user.id,
          isBot: user.is_bot
        }
      }))
    }
  })
})

const onMessage = payload => new Promise((resolve, reject) => {
  var user = userList.find(user => user.id === payload.user && !(user.isBot || user.name === 'slackbot'))
  if (!user) {
    reject('User is bot')
    return
  }
  console.log(`${user.name} spoke: ${payload.text}`)
  let response = messageResponses.find(m => {
    let regexp = new RegExp(`(^|[^a-zA-Z0-9])${escapeStringRegex(m.trigger)}([^a-zA-Z0-9]|$)`, 'gi')
    return payload.text.match(regexp)
  })
  if (response) {
    slack.chat.postMessage({
      token: accessToken,
      channel: payload.channel,
      text: response.responses[Math.floor(Math.random() * response.responses.length)]
    }, (err, res) => {
      if (err) reject(err)
      else resolve(res)
    })
  } else {
    resolve()
  }
})

const onStart = () => {
  console.log('Bot is in the hood')
  getUserList().then(list => {
    console.log('Bot has got the list')
    userList = list
  }).catch(err => {
    console.error('Error getting user list', err)
  })
}

// Bot Listen:

bot.started(onStart)

bot['message'](onMessage)
bot['message.mpim'](onMessage)
bot['message.groups'](onMessage)
bot['message.im'](onMessage)
bot['message.channels'](onMessage)

bot.listen({token: accessToken})

// Web Methods:

webserver.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200)
    res.end()
  } else if (req.url.indexOf('/public') === 0) {
    console.log('serving')
    fileserver.serve(req, res)
  } else {
    res.writeHead(200)
    res.end()
  }
})

// Web Listen:

webserver.listen(port, hostname)

