import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getTeacherCurriculums } from "../../../redux/reducers/CurriculumReducer";
import { getUserFavorites } from "../../../redux/reducers/FavoriteReducer";
import CurriculumCard from "../../Home/Components/CurriculumCard";

export default function Curriculum() {
  const dispatch = useDispatch();
  const { teacherCurriculums = [] } = useSelector((state) => state.curriculum);

  useEffect(() => {
    dispatch(getTeacherCurriculums());
    dispatch(getUserFavorites());
  }, [dispatch]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-5 mt-7.5">
        <h2 className="text-[28px] font-medium">My Curriculum</h2>
        <Link to="/create-curriculum" className="text-base flex items-center gap-1 cursor-pointer">
          Create a curriculum +
        </Link>
      </div>

      <div className="w-full mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-7 gap-4">
        {teacherCurriculums.map((curriculum) => (
          <CurriculumCard
            key={curriculum._id}
            course={curriculum}
            linkTo={`/edit-curriculum/${curriculum._id}`}
          />
        ))}
      </div>
    </div>
  );
}
