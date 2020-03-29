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
    port: 27017,
    dbName: 'mongo-mem-test',
    debug: false,
  },
  binary: {
    version: 'latest',
  },
  autoStart: true,
})

const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use('/timeline', router)

const user1Id = new mongoose.Types.ObjectId()
const user2Id = new mongoose.Types.ObjectId()
const user3Id = new mongoose.Types.ObjectId()

test.before(() => {
  async function con() {
    try {
      const uri = 'mongodb://localhost:27017/mongo-mem-test'
      await mongoose.connect(uri, { useNewUrlParser: true })
      console.log('test: connect ' + uri)
      clearInterval(timerId)
    }
    catch(err) {
      console.log('test: connect err' + err)
    }
  }

  const timerId = setInterval(con, 1000)
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

