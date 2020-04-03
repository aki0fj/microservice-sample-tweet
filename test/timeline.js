const test = require('ava')
const supertest = require('supertest')
const mongoose = require('mongoose')
const express = require('express')
const bodyParser = require('body-parser')
const { MongoMemoryServer } = require('mongodb-memory-server')

console.error = () => {}
const router = require('../controllers/v1/timeline.js')
const model = require('../models/tweet.js')
const Tweet = model.Tweet

const mongod = new MongoMemoryServer({
  instance: {
  },
  binary: {
    version: 'latest',
  },
})

const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use('/timeline', router)

const user1Id = new mongoose.Types.ObjectId()
const user2Id = new mongoose.Types.ObjectId()
const user3Id = new mongoose.Types.ObjectId()

test.before(async () => {
  const uri = await mongod.getConnectionString()
  mongoose.connect(uri, { useNewUrlParser: true })
})

test.beforeEach(async t => {
  let tweets = []
  tweets.push(await new Tweet({ userId: user1Id, content: 'aaa' }).save())
  tweets.push(await new Tweet({ userId: user1Id, content: 'bbb' }).save())
  tweets.push(await new Tweet({ userId: user2Id, content: 'ccc' }).save())
  tweets.push(await new Tweet({ userId: user2Id, content: 'ddd' }).save())
  tweets.push(await new Tweet({ userId: user3Id, content: 'eee' }).save())
  t.context.tweets = tweets
  console.log('set tweets');
})

test.afterEach.always(async () => {
  await Tweet.deleteMany().exec()
})

// POST /timeline
test.serial('get timeline', async t => {
  console.log('start get timeline');
  const res = await supertest(app)
    .post('/timeline')
    .send([user1Id.toString(), user2Id.toString()])
  t.is(res.status, 200)
  t.is(res.body.length, 4)
})

