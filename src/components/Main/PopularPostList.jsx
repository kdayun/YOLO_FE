import '../../styles/component/main/MainPostList.scss';
// import DummyPostImage from '../../assets/images/DummyPostImage.jpg';
import api from '../../utils/api';
import NoImage from '../../assets/images/NoImage.webp';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PopularPostItem = ({ postId, image, title, categories, data }) => {
  const navigate = useNavigate();

  const onClickedPost = () => {
    console.log(image);
    console.log(postId);
    console.log(data);
    navigate(`/post-page/check/${postId}`, {
      state: { postData: data },
    });
  };
  return (
    <div className="mainPostItem_Container" onClick={onClickedPost}>
      <div className="mainPostImage_Container">
        <img
          src={image ? NoImage : image}
          style={{ width: '147px', height: '108px' }}
        />
      </div>
      <div className="mainPostTitle_Container">{title}</div>
      <div className="mainPostTag">{categories}</div>
    </div>
  );
};

export default function PopularPostList() {
  const [popularPostList, setPopularPostList] = useState([]);

  useEffect(() => {
    const getPopularPost = async () => {
      try {
        const popularList = await api.get('/api/v1/post/popular');
        console.log(popularList.data.data);
        setPopularPostList(popularList.data.data);
        console.log(popularPostList);
      } catch (error) {
        console.log(error);
      }
    };
    getPopularPost();
  }, []);

  useEffect(() => {
    console.log(popularPostList);
  }, [popularPostList]);

  return (
    <div className="mainPost_Container">
      {popularPostList.map((post, index) => (
        <PopularPostItem
          key={index}
          postId={post.postInfo.postId}
          title={post.postInfo.title}
          categories={post.postInfo.categories}
          image={post.postImage}
          data={post}
        />
      ))}
    </div>
  );
}
