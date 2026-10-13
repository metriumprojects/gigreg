import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getUserWithdrawals } from '../../../redux/reducers/WithdrawalReducer';

const PayoutHistory = () => {
  const { userWithdrawals } = useSelector((state) => state.withdrawal);
  const dispatch = useDispatch();
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [withdrawalLimit, setWithdrawalLimit] = useState(10);

  useEffect(() => {
    dispatch(getUserWithdrawals({ page: withdrawalPage, limit: withdrawalLimit }));
  }, [dispatch, withdrawalPage, withdrawalLimit]);

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl max-w-5xl">
        <table className="w-full rounded-2xl overflow-hidden">
          <thead className="bg-[#E9EAEE] text-left text-sm">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Payout Amount</th>
              <th className="p-4">Payment Method</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>

          <tbody className="bg-[#F5F5F5]">
            {userWithdrawals && userWithdrawals.length > 0 ? (
              userWithdrawals.map((payout, index) => (
                <tr key={index} className="">
                  <td className="p-3">
                    {payout?.createdAt
                      ? new Date(payout.createdAt).toLocaleDateString('en-IN')
                      : 'N/A'}
                  </td>
                  <td className="p-3">${payout?.amount}</td>
                  <td className="p-3">Bank Transfer</td>
                  <td className="p-3">
                    <span>{payout?.status}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  No payout history found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PayoutHistory;
