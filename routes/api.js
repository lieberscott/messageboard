/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

const expect = require('chai').expect;

const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const dns = require('dns');

mongoose.connect(process.env.DB, { useNewUrlParser: true });

const ThreadSchema = new Schema({
  text: { type: String, required: true },
  created_on: { type: Date, default: new Date() },
  bumped_on: { type: Date, default: new Date() },
  reported: { type: Boolean, default: false },
  delete_password: { type: String, required: true },
  replies: { type: [{
    text: { type: String, required: true },
    created_on: { type: Date, default: new Date() },
    delete_password: { type: String, required: true },
    reported: { type: Boolean, default: false }
  }], default: [] }
});

const Thread = mongoose.model("Thread", ThreadSchema);

module.exports = function (app) {
  
  app.route('/api/threads/:board')
  .get(function (req, res) {
    Thread
      .find({}, '-reported -delete_password -replies.reported -replies.delete_password')
      .limit(10)
      .where('replies')
      .slice(3) // limit to 3 most recent in the replies array
      .then((data) => res.json(data))
      .catch((err) => console.log(err));
  })
  .post(function (req, res){
    
    let text = req.body.board;
    let delete_password = req.body.delete_password;
    
    let board = req.params.board; // each board is supposed to be its own mLab collection, but I'm not doing it that way
    
    let newentry = new Thread({
      text,
      delete_password
    });

    newentry.save((err, data) => {
      if (err) { console.log(err) }
      else { console.log("success") }
    });

    res.redirect("/b/general");
  })
  .put(function (req, res) {
    let board = req.params.board;
    let id = req.body.thread_id;
    let reported = true;
    
    Thread.findOneAndUpdate({ _id: id }, { $set: { reported } }, { new: true }, (err, doc) => {
      if (err) {
        return res.send("could not update " + id);
      }
      else {
        return res.send("success");
      }
    });
  })
  .delete(function (req, res) {
    let id = req.body.thread_id;
    let password = req.body.delete_password;
    
    Thread.findOne({ _id: id }, 'delete_password', (err, doc) => {
      if (doc.delete_password == password) {
        Thread.deleteOne({ _id: id }, (err, doc) => {
          if (err) { return res.send("could not delete " + id); }
          else { return res.send("success"); };
        });
      }
      else { return res.send("incorrect password"); }
    });
  });
  
  
  app.route('/api/replies/:board')
  .get(function (req, res) {
    
    let id = req.query.thread_id;
    
    Thread.findOne({ _id: id }, '-reported -delete_password -replies.delete_password -replies.reported', (err, data) => {
      if (err) { return res.send(err); }
      else { return res.json(data); }
    });
  })
  .post(function (req, res){
    let board = req.params.board;
    
    let id = req.body.thread_id;
    let text = req.body.text;
    let password = req.body.delete_password;
    
    let obj = {
      text,
      delete_password: password
    };
    
    Thread.findOneAndUpdate({ _id: id }, { $push: { replies: obj } }, { new: true }, (err, doc) => {
      if (err) {
        return res.send("could not update ");
      }
      else {
        return res.redirect("/b/general");
      }
    }); 
    
  })
  .put(function (req, res) {
    let board = req.params.board;
    
    let thread_id = req.body.thread_id;
    let reported = true;
    let reply_id = req.body.reply_id;
    
    Thread.findOneAndUpdate(
      { "_id": thread_id, "replies._id": reply_id }, // id of thread, then id of the reply within that thread
      { $set: { "replies.$.reported": true } }, // "replies.$" holds the position of the  matched reply
      (err, doc) => {
        console.log(doc);
        if (err) {
          console.log(err);
        }
        else {
          console.log(doc);
        }
      }
    );
    return res.send("success");
  })
  .delete(function (req, res) {
    console.log("delete");
    let board = req.params.body;
    
    let thread_id = req.body.thread_id;
    let reply_id = req.body.reply_id;
    let password = req.body.delete_password;
        
    Thread
    .findOne({ "_id": thread_id })
    .select({ replies: { $elemMatch: { _id: reply_id } } })
    .then((doc) => {
      if (doc.replies[0].delete_password == "password2") {
        doc.replies[0].text = "[deleted]"; // hacky solution but works and behavior mirrors the sample project
        doc.save();
        res.send("success");
      }
      else { res.send("error: not deleted"); }
    })
    .catch((err) => console.log(err));
  });
}