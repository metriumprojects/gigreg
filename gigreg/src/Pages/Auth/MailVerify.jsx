import React, { useEffect } from 'react'
import MainLayout from '../../components/MainLayout'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { VerifyUser } from '../../redux/reducers/AuthReducer'

const MailVerify = () => {
    const { token } = useParams()
    const dipatch = useDispatch();

    useEffect(() => {
        dipatch(VerifyUser(token))
    }, [token])


  return (
    <MainLayout>
    <div className='py-8 text-sm max-w-[32rem] mx-auto text-center min-h-[77vh]'>
      Account verification successful!
      Please <Link to="/login" className='text-primary'>login</Link> to continue.
    </div>
    </MainLayout>
  )
}

export default MailVerify
