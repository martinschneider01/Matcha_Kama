var pool = require('../helpers/dbConnect');

var User = {
  getOneByUsername: function({username}) {
    return pool.query('SELECT * from users WHERE username = ?', [username]);
  },
  getOneById: function({id}) {
    return pool.query('SELECT * from users WHERE id = ?', [id]);
  },
  getOneByEmail: function({email}) {
    return pool.query('SELECT * from users WHERE email = ?', [email]);
  },
  newUser: function({username, email, firstname, lastname}, password_hash, validation_code) {
    return pool.query('INSERT INTO users (username, password, email, firstname, lastname, validation_code) VALUES (?,?,?,?,?,?)', [username, password_hash, email, firstname, lastname, validation_code]);
  },
  confirmOne: function(validation_code) {
    return pool.query('UPDATE users SET validation_code = NULL WHERE validation_code = ?', [validation_code]);
  },
  setResetCode: function(email, reset_code) {
    return pool.query('UPDATE users SET reset_code = ? WHERE email = ?', [reset_code, email]);
  },
  resetPassword: function(reset_code, password) {
    return pool.query('UPDATE users SET password = ? WHERE reset_code = ?', [password, reset_code]);
  }
};

module.exports = User;