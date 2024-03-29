const CONFIG = require('../config/Config');
const validator = require('../helpers/Validator');
var passport = require('passport');
var jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const profileModel = require('../models/profileModel');
const sendMail = require('../helpers/sendMail');
const bcrypt = require('bcrypt');
const fetch = require('node-fetch');
const getCity = require('../helpers/getCity');


module.exports = {

  testFunction: function() {
    console.log('prout');
  },

  getToken(req, res) {
    passport.authenticate('local', {session: false}, (err, user) => {
      if (user == false)
        err = 'Bad query';
      if (err) {
        return res.status(400).json({
          err: err
        });
      }
      req.login(user, {session: false}, async (err) => {
        if (err) {
          res.status(400).send({err});
        }
        const token = jwt.sign(user, CONFIG.API_SECRET_JWT_KEY);
        res.json({success: true, token});
        if (req.body.ip) {
          const response = await fetch('http://api.ipstack.com/' + req.body.ip + '?access_key=' + CONFIG.IPSTACK_API);
          const json = await response.json();
          let position = {
            lat: json.latitude,
            lon: json.longitude
          };
          profileModel.updatePosition(user.id, JSON.stringify(position), await getCity(json.latitude, json.longitude));
        }
      });
    })(req, res);
  },




  async createAccount(req, res) {
    if (!req.body.username || req.body.username.length == 0 ||
      !req.body.password || req.body.password.length == 0 ||
      !req.body.email || req.body.email.length == 0 ||
      !req.body.firstname || req.body.firstname.length == 0 ||
      !req.body.lastname || req.body.lastname.length == 0)
      return res.status(400).send({err: 'Bad query'});
    let validateUserInputError = validator.validateUserInput(req.body);
    if (validateUserInputError)
      return res.status(400).send({err: validateUserInputError});
    const username = req.body.username;
    const email = req.body.email;
    let userExistUsername;
    let userExistEmail;
    try {
      userExistUsername = await userModel.getOneByUsername({username});
      userExistEmail = await userModel.getOneByEmail({email});
    }
    catch (error) {
      console.log(error);
      return res.status(500).send({err: 'Error while connecting to database'});
    }
    if (userExistUsername.length != 0)
      return res.status(400).send({err: 'An user with this username already exist.'});
    if (userExistEmail.length != 0)
      return res.status(400).send({err: 'An user with this email address already exist.'});
    const validation_code = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
    try {
      const password_hash = await bcrypt.hash(req.body.password, 10);
      let prout = await userModel.newUser(req.body, password_hash, validation_code);
      await profileModel.createOneEmpty(prout.insertId);
    } catch(error) {
      console.log(error);
      return res.status(500).send({err: 'Error while connecting to database'});
    }
    try {
      const dest = req.body.email;
      const title = 'Please confirm your account';
      const message = 'Please click on this link to validate your account: http://' + CONFIG.FRONT_HOSTNAME + '/confirm/' + validation_code;
      await sendMail(dest, title, message);
    }
    catch (err) {
      console.log(err);
      return res.status(500).send({err});
    }
    res.send({success: true});
  },




  async confirmAccount(req, res) {
    if (!req.params.confirmcode || req.params.confirmcode.length == 0) {
      return res.status(400).send({ err: 'Empty confirmation code.'});
    }
    const test = await userModel.confirmOne(req.params.confirmcode);
    if(test.affectedRows == 0)
      return res.status(400).send({err: 'Invalid confirmation code or user already validated.'});
    res.send({success: true, message: 'Confirmed. You can now loggin!'});
  },




  async generateResetCode(req, res) {
    if (!req.body.email || req.body.email.length == 0) {
      return res.status(400).send({err: 'Empty email. Please enter one'});
    }
    let user;
    try {
      const email = req.body.email;
      user = await userModel.getOneByEmail({email});
      if (user.length == 0)
        return res.status(400).send({err: 'No username with this address'});
      const reset_code = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
      await userModel.setResetCode(email, reset_code);
      const title = 'Reset your password';
      const message = 'Please click on this link to reset your password\'s account: http://' + CONFIG.FRONT_HOSTNAME + '/reset/' + reset_code;
      await sendMail(email, title, message);
      res.send({success: true, message: 'Reset code sent to your email address. Please follow this link to reset your password'});
    }
    catch (e) {
      return res.status(500).send({err: 'Error while connecting to database'});
    }
  },

  async resetPassword(req, res) {
    if (!req.params.resetcode || req.params.resetcode.length == 0) {
      return res.status(400).send({err: 'Empty reset code. Please enter one'});
    }
    try {
      let err = validator.password(req.body.password);
      if (err)
        return res.status(400).send({err});
      const password_hash = await bcrypt.hash(req.body.password, 10);
      const reset = await userModel.resetPassword(req.params.resetcode, password_hash);
      if(reset.affectedRows == 0)
        return res.status(400).send({err: 'Invalid reset code.'});
      res.send({success: true, message: 'Your password was reset. Please loggin again'});
    } catch(e) {
      res.status(500).send({err: 'Error while connecting to database'});
    }
  },

  async changeEmail(req, res) {
    let err;
    const email = req.body.email;
    if ((err = validator.email(email))) {
      return res.status(400).send({err});
    }
    console.log(email);
    try {
      const checkEmailUser = await userModel.getOneByEmail({email});
      if (checkEmailUser.length != 0) {
        return res.status(400).send({err: 'An user with this email already exist, please choose another one'});
      }
      const validation_code = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
      await userModel.updateNewEmail(req.user.id, email, validation_code);
      const title = 'Please confirm your new email address';
      const message = 'Please click on this link to validate your new email address: http://' + CONFIG.FRONT_HOSTNAME + '/confirmnewemail/' + validation_code;
      await sendMail(email, title, message);
      res.send({success: true, message: 'Please confirm your new email address'});
    } catch (err) {
      return res.status(500).send({err});
    }
  },

  async changeEmailConfirm(req, res) {
    if (!req.params.confirm_code || req.params.confirm_code.length == 0) {
      return res.status(400).send({ err: 'Empty confirmation code.'});
    }
    const test = await userModel.confirmNewEmail(req.params.confirm_code);
    if(test.affectedRows == 0)
      return res.status(400).send({err: 'Invalid confirmation code or email already changed.'});
    res.send({success: true, message: 'Confirmed. Your email is now updated'});

  },

  async changePassword(req, res) {
    let err = validator.password(req.body.password);
    if (err)
      return res.status(400).send({err});
    const password_hash = await bcrypt.hash(req.body.password, 10);
    try {
      await userModel.updatePassword(req.user.id, password_hash);
    } catch (err) {
      return res.status(500).status({err});
    }
    return res.send({success: true});
  },

  async updatePosition(req, res) {
    if (!req.body.lat || !req.body.lon) {
      return res.status(400).send({err: 'Error in your position input'});
    }
    let position = {
      lat: req.body.lat,
      lon: req.body.lon
    };
    try {
      await profileModel.updatePosition(req.user.id, JSON.stringify(position), await getCity(position.lat, position.lon));
    } catch (err) {
      return res.send(500).send({err});
    }
    res.send({success: true});
  }
};
