const multer = require('multer');
const _ = require('lodash');
const validator = require('../helpers/Validator');
const profileModel = require('../models/profileModel');
const userModel = require('../models/userModel');
const tagModel = require('../models/tagModel');
const uploadFolder = __dirname + '/../public/uploads';
const notificationModel = require('../models/notificationModel');
const blockedModel = require('../models/blockedModel');
const likeModel = require('../models/likeModel');
const messageModel = require('../models/messageModel');

// File upload functions
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + _.kebabCase(file.originalname) + '-' + Date.now() + '.' + file.mimetype.split('/')[1]);
  }
});
const fileMimeTester = function(req, file, cb) {
  if (file.mimetype != 'image/gif' && file.mimetype != 'image/png' && file.mimetype != 'image/jpeg' && file.mimetype != 'image/bmp')
  {
    return cb(null, false);
  }
  cb(null, true);
};
var upload_avatar = multer({storage, fileFilter: fileMimeTester, limits: {fileSize:  4 * 1024 * 1024}}).single('avatar'); //4MB max
var upload_image = multer({storage, fileFilter: fileMimeTester, limits: {fileSize:  4 * 1024 * 1024}}).single('image'); //4MB max



module.exports = {
  async getProfile(req, res) {
    try {
      let ret = await profileModel.getOne(req.user.id);
      const querytags = await tagModel.getUserTags(req.user.id);
      let tags = Array();
      querytags.forEach(function(element) {
        tags.push(element.title);
      });
      ret[0]['tags'] = tags;
      res.send(ret[0]);
    } catch(err) {
      console.log(err);
      res.status(500).send({err});
    }
  },

  async editAge(req, res){
    let err;
    if ((err = validator.age(req.body.age)))
      return res.status(400).send({err});
    try {
      await profileModel.updateAge(req.user.id, req.body.age);
      res.send({success: true});
    } catch(err) {
      console.log(err);
      res.status(500).send({err});
    }
  },

  async editGender(req, res){
    let err;
    if ((err = validator.gender(req.body.gender)))
      return res.status(400).send({err});
    try {
      await profileModel.updateGender(req.user.id, req.body.gender);
      res.send({success: true});
    } catch(err) {
      console.log(err);
      res.status(500).send({err});
    }
  },

  async editSexualOrientation(req, res){
    let err;
    if ((err = validator.sexual_orientation(req.body.sexual_orientation)))
      return res.status(400).send({err});
    try {
      await profileModel.updateSexualOrientation(req.user.id, req.body.sexual_orientation);
      res.send({success: true});
    } catch(err) {
      console.log(err);
      res.status(500).send({err});
    }
  },

  async editBio(req, res){
    let err;
    if ((err = validator.bio(req.body.bio)))
      return res.status(400).send({err});
    try {
      await profileModel.updateBio(req.user.id, req.body.bio);
      res.send({success: true});
    } catch(err) {
      console.log(err);
      res.status(500).send({err});
    }
  },

  avatarUpload(req, res, next) {
    upload_avatar(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        res.status(400).send({err: err.message});
      } else if (err) {
        res.status(500).send({err: err.message});
      }
      else {
        next();  
      }
    });
  },

  async avatarEnd(req, res) {
    if (req.file) {
      try {
        const oldAvatar = await profileModel.getAvatar(req.user.id);
        if (oldAvatar[0].avatar) {
          const fs = require('fs');
          const util = require('util');
          const unlink = util.promisify(fs.unlink);
          try {
            console.log(uploadFolder + '/' + oldAvatar[0].avatar);
            await unlink(uploadFolder + '/' + oldAvatar[0].avatar);
          }
          catch (e) {
            console.error('Image already removed from disk, continue');
          }
        }
        await profileModel.updateAvatar(req.user.id, req.file.filename);
        res.send({success: true, image: req.file.filename});
      } catch (err) {
        console.log(err);
        res.status(500).send({err});
      }
    }
    else
      res.status(400).send({err: 'No file received or file is not a valid image'});  
  },

  imageUpload(req, res, next) {
    upload_image(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        res.status(400).send({err: err.message});
      } else if (err) {
        res.status(500).send({err: err.message});
      }
      else {
        next();  
      }
    });
  },

  async imageEnd(req, res) {
    const fs = require('fs');
    const util = require('util');
    const unlink = util.promisify(fs.unlink);
    if (req.file) {
      try {
        const rawArray = await profileModel.getImages(req.user.id);
        let images = JSON.parse(rawArray[0].images);
        if (images.length >= 4)
        {
          unlink(uploadFolder + '/' + req.file.filename);
          return res.status(400).send({err: 'Already got 4 images, please delete one'});
        }
        images.push(req.file.filename);
        await profileModel.updateImages(req.user.id, JSON.stringify(images));
        res.send({success: true, image: req.file.filename});
      } catch (err) {
        console.log(err);
        res.status(500).send({err});
      }
    }
    else
      res.status(400).send({err: 'No file received or file is not a valid image'});  
  },

  async editFirstName(req, res){
    let err;
    if ((err = validator.firstname(req.body.firstname)))
      return res.status(400).send({err});
    try {
      await userModel.updateFirstName(req.user.id, req.body.firstname);
      res.send({success: true});
    } catch(err) {
      console.log(err);
      res.status(500).send({err});
    }
  },

  async editLastName(req, res){
    let err;
    if ((err = validator.lastname(req.body.lastname)))
      return res.status(400).send({err});
    try {
      await userModel.updateLastName(req.user.id, req.body.lastname);
      res.send({success: true});
    } catch(err) {
      console.log(err);
      res.status(500).send({err});
    }
  },

  async imageDelete(req, res) {
    const fs = require('fs');
    const util = require('util');
    const unlink = util.promisify(fs.unlink);
    try {
      const rawArray = await profileModel.getImages(req.user.id);
      let images = JSON.parse(rawArray[0].images);
      if (!images[req.params.image_id]) {
        return res.status(400).send({err: 'This image id doesn\'t exist'});
      }
      const toRemove = images[req.params.image_id];
      images.splice(req.params.image_id, 1);
      await profileModel.updateImages(req.user.id, JSON.stringify(images));
      await unlink(uploadFolder + '/' + toRemove);
      res.send({success: true});
    } catch (err) {
      if (err.code == 'ENOENT') {
        return res.send({success: true});
      }
      console.log(err);
      res.status(500).send({err});
    }
  },

  async getMostUsedTags(req, res) {
    const query = await tagModel.most100Popular();

    let test = Array();
    query.forEach(function(element) {
      test.push(element.title);
    });
    res.send(test);
  },

  async updateTags(req, res) {
    if (!req.body.tags || req.body.tags.length == 0)
      return res.status(400).send('Please enter at least one tag');
    const querytags = await tagModel.getUserTags(req.user.id);
    let oldTags = Array();
    querytags.forEach(function(element) {
      oldTags.push(element.title);
    });
    const newTags = req.body.tags.map(x => _.deburr(x).toLowerCase().trim());
    let toAdd = Array();
    let toRemove = Array();
    oldTags.forEach(x => {
      if (newTags.indexOf(x) < 0) {
        toRemove.push(x);
      }
    });
    newTags.forEach(x => {
      if (oldTags.indexOf(x) < 0) {
        toAdd.push(x);
      }
    });
    try {
      await tagModel.createTags(toAdd);
      await tagModel.removeTags(req.user.id, toRemove);
      await tagModel.addTags(req.user.id, toAdd);
      res.send({success: true});
    } catch (err) {
      console.log(err);
      res.status(500).send({err});
    }
  },
  async getNotifications(req, res) {
    try {
      const ret = notificationModel.get100(req.user.id);
      res.send(await ret);
    } catch (err) {
      res.status(500).send({err});
    }
  },
  async setNotifAsRead(req, res) {
    try {
      await notificationModel.setAsRead(req.user.id);
      res.send({success: true});
    } catch (err) {
      res.status(500).send({err});
    }
  },
  async readNotif(req, res) {
    try{
      if (!req.body.id)
        return res.status(400).send({err: 'Please enter a valid notification ID'});
      await notificationModel.setOneAsRead(req.user.id, req.body.id);
      res.send({success: true});
    } catch (err) {
      console.log(err);
      res.status(500).send({err});
    }
  },
  async getBlockedUsers(req, res) {
    try {
      const ret = await blockedModel.getAllBlocked(req.user.id);
      res.send(ret);
    } catch (err) {
      res.status(500).send({err});
    }
  },
  async getHistoryVisits(req, res) {
    try {
      const visits = await notificationModel.get100Visits(req.user.id);
      res.send({success:true, visits});
    } catch (err) {
      console.log(err);
      res.status(500).send({err});
    }
  },
  async getVisits(req, res) {
    try {
      const visits = await notificationModel.get100Notifs(req.user.id, 'V');
      res.send({success:true, visits});
    } catch (err) {
      console.log(err);
      res.status(500).send({err});
    }
  },
  async getLikes(req, res) {
    try {
      const likes = await notificationModel.get100Notifs(req.user.id, 'L');
      res.send({success:true, likes});
    } catch (err) {
      console.log(err);
      res.status(500).send({err});
    }
  },
  async getMatchs(req, res) {
    try {
      const matchs = await notificationModel.get100Notifs(req.user.id, 'M');
      res.send({success:true, matchs});
    } catch (err) {
      console.log(err);
      res.status(500).send({err});
    }
  },
  async getUnmatch(req, res) {
    try {
      const unmatchs = await notificationModel.get100Notifs(req.user.id, 'U');
      res.send({success:true, unmatchs});
    } catch (err) {
      console.log(err);
      res.status(500).send({err});
    }
  },
  async nbNewNotifs(req, res) {
    try {
      let nb = await notificationModel.getNbUnreadNotifs(req.user.id);
      nb = nb[0]['COUNT(*)'];
      res.send({success: true, nb});
    } catch (err) {
      res.status(500).send({err});
    }
  },
  async getMatchedUsers(req, res) {
    try {
      const matched = await likeModel.getAllMatchs(req.user.id);
      res.send({matched});
    } catch (err) {
      res.status(500).send({err});
    }
  },
  async nbNewMessages(req, res) {
    try {
      let nb = await notificationModel.getNbNewMessages(req.user.id);
      nb = nb[0]['COUNT(*)'];
      res.send({success: true, nb});
    } catch (err) {
      res.status(500).send({err});
    }
  },
  async setMessagesAsReadFrom(req, res) {
    try {
      await messageModel.setAllAsRead(req.user.id, req.params.id);
      res.send({success: true});
    } catch (err) {
      res.status(500).send({err});
    }
  }
};