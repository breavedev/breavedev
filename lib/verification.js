const crypto = require('crypto')
const nodemailer = require('nodemailer')
const config = require('./../config')

module.exports = (email, db) => {
    return new Promise((resolve, reject) => {
        const expire_token = crypto.randomBytes(16).toString('hex')
        db.query('UPDATE users SET token=?, email_verified=0 WHERE email=?', [expire_token, email], (err, result) => {
            if(err) reject(err)
            const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: config.emailAdminUsername, pass: config.emailAdminPassword } })
            const mailOptions = { 
                from: 'no-reply@yourwebapplication.com', 
                to: email, 
                subject: 'Account Verification', 
                text: 'Hello,\n\n' + 'Please verify your account by clicking the link: \nhttp://' + config.domain + ':' + config.port + '/confirmation?expire-token=' + expire_token + '.\n' 
            }
            transporter.sendMail(mailOptions, err => {
                if(err) reject(err)
                resolve(true)
            })
        })
    })
}