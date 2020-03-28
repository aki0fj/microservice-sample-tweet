const test = require('ava')
const supertest = require('supertest')
const mongoose = require('mongoose')
const express = require('express')
const bodyParser = require('body-parser')
const { MongoMemoryServer } = require('mongodb-memory-server')

console.error = () => {}
const router = require('../controllers/v1/tweets.js')
const model = require('../models/tweet.js')
const Tweet = model.Tweet

const mongod = new MongoMemoryServer()
const app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use('/tweets', router)

const user1Id = new mongoose.Types.ObjectId()
const user2Id = new mongoose.Types.ObjectId()

test.before(async () => {
  const uri = await mongod.getConnectionString()
  mongoose.connect(uri, { useNewUrlParser: true })
})

test.beforeEach(async t => {
  let tweets = []
  tweets.push(
    await new Tweet({
      userId: user1Id,
      content: 'aaa'
    }).save()
  )
  tweets.push(
    await new Tweet({
      userId: user1Id,
      content: 'bbb'
    }).save()
  )
  tweets.push(
    await new Tweet({
      userId: user2Id,
      content: 'ccc'
    }).save()
  )
  tweets.push(
    await new Tweet({
      userId: user2Id,
      content: 'ddd'
    }).save()
  )
  t.context.tweets = tweets
})

test.afterEach.always(async () => {
  await Tweet.deleteMany().exec()
})

// GET /tweets
test.serial('get tweets', async t => {
  const res = await supertest(app).get('/tweets')
  t.is(res.status, 200)
  t.is(res.body.length, 4)
  t.is(res.body[0]._id, t.context.tweets[3]._id.toString())
})

// GET /tweets/:id
test.serial('get tweet', async t => {
  const target = t.context.tweets[0]
  const res = await supertest(app).get(`/tweets/${target._id}`)
  t.is(res.status, 200)
  t.is(res.body._id, target._id.toString())
  t.is(res.body.userId, target.userId.toString())
  t.is(res.body.content, target.content)
})

test.serial('get tweet not found', async t => {
  const res = await supertest(app).get(
    `/tweets/${new mongoose.Types.ObjectId()}`
  )
  t.is(res.status, 404)
  t.deepEqual(res.body, { error: 'NotFound' })
})

test.serial('get tweet id is invalid', async t => {
  const res = await supertest(app).get('/tweets/invalid')
  t.is(res.status, 400)
  t.deepEqual(res.body, { error: 'BadRequest' })
})

// POST /tweets
test.serial('create tweet', async t => {
  const content = 'xxx'
  const res = await supertest(app)
    .post('/tweets')
    .send({ userId: user1Id.toString(), content: content })
  t.is(res.status, 200)
  t.true('_id' in res.body)
  t.is(res.body.content, content)
})

test.serial('create tweet no userId', async t => {
  const content = 'xxx'
  const res = await supertest(app)
    .post('/tweets')
    .send({ content: content })
  t.is(res.status, 400)
  t.deepEqual(res.body, { error: 'BadRequest' })
})

test.serial('create tweet no content', async t => {
  const res = await supertest(app)
    .post('/tweets')
    .send({ userId: user1Id.toString() })
  t.is(res.status, 400)
  t.deepEqual(res.body, { error: 'BadRequest' })
})

test.serial('create tweet content is empty', async t => {
  const res = await supertest(app)
    .post('/tweets')
    .send({ userId: user1Id.toString(), content: '' })
  t.is(res.status, 400)
  t.deepEqual(res.body, { error: 'BadRequest' })
})

test.serial('create tweet content is too long', async t => {
  const res = await supertest(app)
    .post('/tweets')
    .send({ userId: user1Id.toString(), content: 'a' * 141 })
  t.is(res.status, 400)
  t.deepEqual(res.body, { error: 'BadRequest' })
})

// DELETE /tweets/:id
test.serial('delete tweet', async t => {
  const res = await supertest(app).delete(`/tweets/${t.context.tweets[0]._id}`)
  t.is(res.status, 200)
  const actual = await Tweet.find()
  t.is(actual.length, 3)
})

test.serial('delete tweet not found', async t => {
  const res = await supertest(app).delete(
    `/tweets/${new mongoose.Types.ObjectId()}`
  )
  t.is(res.status, 404)
  t.deepEqual(res.body, { error: 'NotFound' })
})

test.serial('delete tweet id is invalid', async t => {
  const res = await supertest(app).delete('/tweets/invalid')
  t.is(res.status, 400)
  t.deepEqual(res.body, { error: 'BadRequest' })
})
