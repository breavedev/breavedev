const path = require('path')
const fs = require('fs')
const bcrypt = require('bcrypt')
const verification = require('./lib/verification')

const mysql = require('mysql')

const db = mysql.createPool({
  host: "zanner.org.ua",
  port: "33321",
  user: "ka65_03",
  password: "199811edikE",
  database: "ka65_03"
})

function isAuthenticated(req, res, next){
  if(req.session.email){
      return next()
  }   
  res.redirect('/login')
}

module.exports = app => {

  app.get('/', (req, res) => {
    res.redirect('/user-profile')
  })

  app.get('/login', (req, res) => {
    res.sendFile(path.resolve(__dirname + '/views/html/login.html'))
  })

  app.post('/login', (req, res, next) => {
    const email = String(req.body.email)
    const password = String(req.body.password)

    //TODO: check for right fields email and password

    db.query('SELECT * FROM users WHERE email=?', [email], (err, result) => {
      if(err) return next(err)
      if(result.length === 0) return next(new Error('User with the same email is not exist'))
      if(result.length === 1){
        const user = result[0]
        if(user.email_verified == true && bcrypt.compareSync(password, user.password)){
          req.session.email = user.email
          res.cookie('email', user.email)
          const response = {code: 0, message: 'User successfuly logged on'}
          res.send(response)
        } else return next(new Error('Password is not match or is not verified, check it'))
      }
    })
  }, (err, req, res, next) => {
    const response = {code: 1, message: err.message}
    res.send(response)
  })

  app.get('/logout', (req, res) => {
    req.session.destroy()
    res.clearCookie("email")
    res.redirect(301, '/login')
  })

  app.get('/register', (req, res) => {
    res.sendFile(path.resolve(__dirname + '/views/html/register.html'))
  })

  app.post('/register', (req, res, next) => {
    const email = String(req.body.email)
    const password = String(req.body.password)

    //TODO: check for right fields email and password

    db.query('SELECT * FROM users WHERE email=?', [email], (err, result) => {
      if(err) return next(err)
      console.log(result)
      if(result.length === 0){
        const hashPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null) 
        db.query('INSERT INTO users(email, password) VALUES(?,?)', [email, hashPassword], (err, result) => {
          if(err) return next(err)
          console.log(result)
          verification(email, db).then(result => {
            const response = {code: 0, message: 'User successfuly registered, check yout email to finish registration'}
            res.send(response) // USe different variantes
          }).catch(err => next(err))
        })
      } else return next(new Error('Email is already registered'))
    })
  }, (err, req, res, next) => {
    const response = {code: 1, message: err.message}
    res.send(response)
  })

  app.get('/confirmation', (req, res, next) => {
    const newToken = req.query["expire-token"]

    db.query('UPDATE users SET email_verified = ? WHERE token = ?', [true, newToken], (err, result) => {
      if(err) return next(err)
      let response
      if(result.affectedRows === 1){
        response = {code: 0, message: 'Verification successfuly finished, try to login'}
      } else {
        response = {code: 1, message: 'This token is not exist'}
      }
      res.redirect("/login")
    })
  }, (err, req, res, next) => {
    const response = {code: 1, message: err.message}
    res.send(response)
  })

  app.get('/user-profile', isAuthenticated, (req, res, next) => {
    res.sendFile(path.resolve(__dirname + '/views/html/user-info.html'))
  })

  app.get('/user-profile/info', isAuthenticated, (req, res, next) => {
    const email = req.query.email
    db.query('SELECT u.email, u.id FROM users u WHERE email = ?', [email], (err, user) => {
      if(err) return next(err)
      if(user.length === 0){
        response = {code: 1, message: 'User is not found'}
      }
      db.query('SELECT e.lname, e.fname, e.math_score, e.ukr_score, e.en_score, e.passport \
      FROM enrollee e WHERE e.user_id = ?', [user[0].id], (err, enrollee) => {
        if(err) return next(err)
        let response
        if(enrollee.length === 0){
          response = {code: 2, message: {email: user[0].email}}
        } else {
          response = {code: 0, message: {email: user[0].email, lname: enrollee[0].lname, fname: enrollee[0].fname, math_score: enrollee[0].math_score, ukr_score: enrollee[0].ukr_score, en_score: enrollee[0].en_score, passport: enrollee[0].passport}}
        }
        res.send(response)
      })
    })
  }, (err, req, res, next) => {
    const response = {code: 1, message: err.message}
    res.send(response)
  })

  app.get('/user-profile/change-password', isAuthenticated, (req, res) => {
    res.sendFile(path.resolve(__dirname + '/views/html/change-password.html'))
  })

  app.post('/user-profile/change-password', isAuthenticated, (req, res, next) => {
    const oldpassword = String(req.body.oldpassword)
    const newpassword = String(req.body.newpassword)
    const email = String(req.session.email)

    db.query('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
      if(err) return next(err)
      if(bcrypt.compareSync(oldpassword, user[0].password)){
        const hashPassword = bcrypt.hashSync(newpassword, bcrypt.genSaltSync(8), null) 
        db.query('UPDATE users SET password = ? WHERE email = ?', [hashPassword, email], (err, result) => {
          if(err) return next(err)
          const response = {code: 0, message: 'Password changed'}
          res.send(response) 
        })
      } else return next(new Error('Old password is wrong'))
    })
  }, (err, req, res, next) => {
    const response = {code: 1, message: err.message}
    res.send(response)
  })

  app.post('/user-profile/change-email', isAuthenticated, (req, res, next) => {
    const oldemail = String(req.body.oldemail)
    const newemail = String(req.body.newemail)

    db.query('UPDATE users SET email=? WHERE email=?', [newemail, oldemail], (err, result) => {
      if(err) return next(err)
      verification(newemail, db).then(result => {
        const response = {code: 0, message: 'Email changed, check it to verify new email'}
        res.send(response) 
      }).catch(err => next(err))
    })
  }, (err, req, res, next) => {
    const response = {code: 1, message: err.message}
    res.send(response)
  })

  app.get('/user-profile/register-enrollee', isAuthenticated, (req, res) => {
    res.sendFile(path.resolve(__dirname + '/views/html/register-enrollee.html'))
  })

  app.post('/user-profile/register-enrollee', isAuthenticated, (req, res, next) => {
    const fname = String(req.body.fname)
    const lname = String(req.body.lname)
    const passport = String(req.body.passport)
    const math_score = Number(req.body.math_score)
    const ukr_score = Number(req.body.ukr_score)
    const en_score = Number(req.body.en_score)
    const university = String(req.body.univ)
    const spec = String(req.body.spec)
    const priority = String(req.body.priority)

    //TODO: check for right fields email and password

      db.query('SELECT id FROM users WHERE email = ?', [req.session.email], (err, user) => {
        if(err) return next(err)
        db.query('SELECT * FROM enrollee e WHERE user_id = ?', [user[0].id], (err, result) => {
          if(err) return next(err)
          if(result.length === 0){
            db.query('INSERT INTO enrollee(fname, lname, passport, math_score, \
              ukr_score, en_score, user_id) VALUES(?,?,?,?,?,?,?)', [fname, lname, passport, math_score, ukr_score, en_score, user[0].id], (err, enrollee) => {
              if(err) return next(err)
              console.log(enrollee)
              db.query('SELECT id FROM specialization WHERE name = ?', [spec], (err, special) => {
                if(err) return next(err)
                db.query('INSERT INTO application(enrollee_id, spec_id, priority) VALUES \
                  (?,?,?)', [enrollee.insertId, special[0].id, priority], (err, result) => {
                  if(err) return next(err)
                  const response = {code: 0, message: 'Enrollee successfuly registered'}
                  res.send(response) // Use different variantes
                })
              })
            })
          } else return next(new Error('Only one application for every user'))
        })
      })
  }, (err, req, res, next) => {
    const response = {code: 1, message: err.message}
    res.send(response)
  })

  app.get('/user-profile/view-app', isAuthenticated, (req, res) => {
    res.sendFile(path.resolve(__dirname + '/views/html/view-app.html'))
  })

  app.get('/get-applications', isAuthenticated, (req, res, next) => {
    const spec = req.query.spec
    db.query('SELECT * FROM application a INNER JOIN specialization s ON \
    a.spec_id=s.id INNER JOIN enrollee e ON e.id=a.enrollee_id WHERE s.name = ?', [spec], (err, result) => {
      if(err) return next(err)
      res.send(result)
    })
  }, (err, req, res, next) => {
    const response = {code: 1, message: err.message}
    res.send(response)
  })

  app.get('/verification', (req, res) => {
    res.sendFile(path.resolve(__dirname + '/views/html/verification.html'))
  })

}