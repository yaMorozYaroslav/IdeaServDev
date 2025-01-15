import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "ya.moroz.yaroslav@gmail.com",
    pass: process.env.GMAIL_KEY,
  },
});
export const sendEmail = async(req,res) => {
 let {owner_email, user_email, user_phone, user_id} = req.body
 console.log(owner_email)
const mailOptions = {
  from: "unreal@nomail.one",
  //~ from: "ya.moroz.yaroslav@gmail.com",
  to: !user_id?owner_email:'yaroslav.moroz.a@gmail.com',
  //~ to: "yaroslav.moroz.a@gmail.com",
  subject: !user_id?"Rent Request":"Email Confirmation",
  //~ text: 'email: ' + d.user_email + ', phone: ' + d.user_phone +
        //~ ' method: ' + d.delivery_method + ', area: ' + d.user_area +
        //~ ' items: ' + d.items
  text: user_id?`Please confirm your email address by visiting 
                      https://hesen-properties-3eefa0d80ae7.herokuapp.com/user/confirmation/${user_id}`
               :`You got a rent request from ${user_email},${user_phone}`
   } 
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email: ", error);
      res.status(409).json({message: error.message})
    } else {
      //~ console.log("Email sent: ", info);
      res.send(info).status(200)
    }
  })
 }
