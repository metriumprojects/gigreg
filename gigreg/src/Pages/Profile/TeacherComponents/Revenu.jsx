import React, { useEffect, useState } from 'react'
import { getUserWithdrawals } from '../../../redux/reducers/WithdrawalReducer';
import { useDispatch, useSelector } from 'react-redux';
import { FaUser, FaChartLine, FaClock } from "react-icons/fa";
import { Link } from 'react-router-dom';
import { IoArrowDownOutline } from 'react-icons/io5';
import { HiMiniUsers } from "react-icons/hi2";
import { GiBackwardTime } from "react-icons/gi";



const Revenu = () => {
    
      const { userInfo, loading } = useSelector((state) => state.auth);
        const { userWithdrawals } = useSelector((state) => state.withdrawal);
    const dispatch = useDispatch();
    const [withdrawalPage, setWithdrawalPage] = useState(1);
    const [withdrawalLimit, setWithdrawalLimit] = useState(10);

        
  useEffect(() => {
    dispatch(getUserWithdrawals({page: withdrawalPage, limit: withdrawalLimit}))
  },[withdrawalPage, withdrawalLimit]);

      // ✅ Top Cards Data
      const currencyBalances = (bucket, legacyValue) => {
        const userCurr = userInfo?.currency || "USD";
        const entries = Object.entries(userInfo?.balances?.[bucket] || {}).filter(([, amount]) => Number(amount) !== 0);
        if (!entries.length && Number(legacyValue)) entries.push([userCurr, Number(legacyValue)]);
        if (!entries.length) {
          return <span>{new Intl.NumberFormat(undefined, { style: "currency", currency: userCurr }).format(0)}</span>;
        }
        return entries.map(([currency, amount]) => (
          <div key={currency}>{new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount))}</div>
        ));
      };

      const stats = [
        {
          label: "Available Balance",
          value: currencyBalances("available", userInfo?.money),
          icon: <FaChartLine className="text-gray-700 text-xl" />,
          bg: "bg-gray-300",
        },
        {
          label: "All-time revenue",
          value: currencyBalances("total", userInfo?.moneyTotal),
          icon: <HiMiniUsers className="text-purple-600 text-xl" />,
          bg: "bg-purple-100",
        },
        {
          label: "Pending payments",
          value: currencyBalances("pending", userInfo?.moneyPending),
          icon: <GiBackwardTime className="text-orange-500 text-xl" />,
          bg: "bg-orange-100",
        },
      ];
  return (
    <div>
      {/* ✅ Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {stats.map((item, index) => (
          <div
            key={index}
            className="bg-[#F5F5F5] rounded-2xl p-4 flex flex-col justify-between md:aspect-square"
          >
            <div className='flex items-center justify-between'>
            <div>
              <p className="text-gray-900 text-sm">{item.label}</p>
              <h2 className="font-medium text-base">
                {item.value}
              </h2>
            </div>

            <div className={`${item.bg} p-3 rounded-md`}>{item.icon}</div>
          </div>
          <div>
            

      {/* ✅ Transfer Button */}
      {index === 0 && (
      <div className='flex items-center justify-center bg-[#E9EAEE] rounded-full px-2 py-2 w-full mt-4 md:mt-0'>
      <Link to={`/withdraw-request`} className="flex items-center justify-center gap-1 text-sm text-black text-center w-full">
        Withdraw to my bank account <IoArrowDownOutline />
      </Link>
      </div>
      )}
          </div>
          </div>
        ))}
      </div>


      
      {/* ✅ Payout History Section */}
      <h2 className="text-[28px] font-medium mb-5 mt-7.5">Payout History</h2>
      <div className="overflow-x-auto rounded-2xl max-w-5xl">
        <table className="w-full rounded-2xl overflow-hidden">
          <thead className="bg-[#E9EAEE] text-left text-sm">
            <tr>
              <th className="p-4">Date</th>
              {/* <th className="p-4">Country</th> */}
              <th className="p-4">Payout Amount</th>
              <th className="p-4">Payment Method</th>
              {/* <th className="p-4">Account Number</th> */}
              {/* <th className="p-4">Bank Name</th> */}
              {/* <th className="p-4">Swift/BIC</th> */}
              {/* <th className="p-4">IBAN</th> */}
              {/* <th className="p-4">routingNumber</th> */}
              <th className="p-4">Status</th>
            </tr>
          </thead>

          <tbody className='bg-[#F5F5F5]'>
            {userWithdrawals?.map((payout, index) => (
              <tr key={index} className="">
                <td className="p-3">
                  {payout?.createdAt ? new Date(payout.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                </td>
                {/* <td className="p-3">{payout?.country}</td> */}
                <td className="p-3">${payout?.amount}</td>
                <td className="p-3">Bank Tranfer</td>
                {/* <td className="p-3">{payout?.accountNo}</td> */}
                {/* <td className="p-3">{payout?.bank}</td> */}
                {/* <td className="p-3">{payout?.swiftBic}</td> */}
                {/* <td className="p-3">{payout?.iban}</td> */}
                {/* <td className="p-3">{payout?.routingNumber}</td> */}
                <td className="p-3"> <span className="">{payout?.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Revenu
