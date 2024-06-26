import { useEffect, useRef, useState } from 'react';
import '../../styles/pages/Post/EditPost.scss';
import { useNavigate, useLocation } from 'react-router-dom';
import Category from './Category';
import { AddPhoto } from '../../assets/svgs/AddPhoto';
import { PreviousIcon } from '../../assets/svgs/PreviousIcon';
import { CancleIcon } from '../../assets/svgs/CancleIcon';
import api from '../../utils/api';

export default function EditPost() {
  const navigate = useNavigate();
  const location = useLocation();
  const imgRef = useRef(null);
  const postData = { ...location.state };
  const [imgUrl, setImgUrl] = useState([]);
  const [preview, setPreview] = useState([]);
  const user = sessionStorage.getItem('accessToken');

  const [formState, setFormState] = useState({
    postId: postData.postInfo.postId,
    title: postData.postInfo.title,
    content: postData.postInfo.content,
    selectedCategories: postData.postInfo.categories,
  });

  const isValidForm = () => {
    return (
      formState.title &&
      formState.content &&
      formState.selectedCategories.length > 0
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState({
      ...formState,
      [name]: value,
    });
  };

  const setSelectedCategories = (categories) => {
    setFormState({
      ...formState,
      selectedCategories: categories,
    });
  };

  const convertURLtoFile = async (url) => {
    try {
      const response = await fetch(url, {
        // mode: 'cors',
        cache: 'no-cache',
      });
      const data = await response.blob();
      const ext = url.split('.').pop(); // url 구조에 맞게 수정할 것
      const filename = url.split('/').pop(); // url 구조에 맞게 수정할 것
      const metadata = { type: `image/${ext}` };
      return new File([data], filename, metadata);
    } catch (error) {
      // console.log(error);
      if (error instanceof TypeError) {
        // 네트워크 오류 또는 Fetch API 관련 오류
        console.error('Network or Fetch API error:', error.message);
      } else {
        // 기타 오류
        console.error('Error:', error.message);
      }
      return null;
    }
  };

  // useEffect(() => {
  //   const initialFiles = () => {
  //     setPreview(postData.postImage.map((image) => image.imageUrl));
  //     postData.postImage.map((image) => {
  //       convertURLtoFile(image.imageUrl).then((file) => {
  //         setImgUrl((prevImageUrl) => [...prevImageUrl, file]);
  //       });
  //     });
  //   };

  //   initialFiles();
  // }, []);

  useEffect(() => {
    const initialFiles = async () => {
      setPreview(postData.postImage.map((image) => image.imageUrl));
      const files = await Promise.all(
        postData.postImage.map((image) => convertURLtoFile(image.imageUrl)),
      );
      setImgUrl(files);
    };

    initialFiles();
  }, [postData.postImage]);

  // console.log('postData', postData.postImage);
  console.log('img', imgUrl);
  // console.log(preview);

  const onChangeImage = (e) => {
    const file = e.target.files[0]; // 첫 번째 파일만 선택

    if (!file) {
      return;
    }

    const reader = new FileReader();
    setImgUrl([...imgUrl, file]);
    reader.onloadend = () => {
      // 이미지를 미리보기로 설정
      setPreview([...preview, reader.result]);
    };

    reader.readAsDataURL(file);
  };

  const handleDeleteImage = (index) => {
    const updatedImagesFile = imgUrl.filter((image, i) => i !== index);
    const updatedImagePreview = preview.filter((image, i) => i !== index);
    console.log(index);
    setImgUrl(updatedImagesFile);
    setPreview(updatedImagePreview);
  };

  const handleSubmit = async () => {
    const formData = new FormData();
    if (imgUrl.length > 0) {
      imgUrl.forEach((file) => {
        formData.append('files', file);
      });
    } else {
      formData.append('files', null);
    }

    formData.append(
      'postUpdateRequestDto',
      new Blob(
        [
          JSON.stringify({
            postId: formState.postId,
            title: formState.title,
            content: formState.content,
            categories: formState.selectedCategories,
          }),
        ],
        { type: 'application/json' },
      ),
    );

    await api
      .post('/api/v1/post/edit', formData, {
        headers: {
          Authorization: `Bearer ${user}`,
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((response) => {
        console.log('수정', response);
        navigate('/post-page');
      })
      .catch((error) => {
        console.log('수정', error);
      });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="onEditContainer">
        <div className="previousIcon" onClick={() => navigate(-1)}>
          <PreviousIcon />
        </div>
        <div
          className="EditButton"
          type="submit"
          onClick={handleSubmit}
          style={{
            background: isValidForm() ? ' #266ED7 6.68%' : '#c2c2c2',
          }}
        >
          수정
        </div>
      </div>
      <div className="Title-container">
        <div className="Title-label">제목</div>
        <input
          name="title"
          className="Title-input"
          placeholder="제목을 입력해주세요."
          value={formState.title}
          onChange={handleChange}
          multiple
        />
      </div>
      <div className="Category-container">
        <div className="Category-label">카테고리</div>
        <Category
          setSelectedCategories={setSelectedCategories}
          selectedCategories={formState.selectedCategories}
        />
      </div>

      <textarea
        name="content"
        className="content-input"
        placeholder="내용을 입력하세요."
        value={formState.content}
        onChange={handleChange}
      />

      {preview && (
        <div className="image-previewContainer">
          {preview.map((image, index) => (
            <div key={index} className="image-preview">
              <img src={image} alt="미리보기" />
              <div
                className="deleteImage"
                onClick={() => handleDeleteImage(index)}
              >
                <CancleIcon />
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className="addImage-container"
        onClick={() => imgRef.current.click()}
      >
        <div className="AddPhoto">
          <AddPhoto />
        </div>
        <div>이미지 추가</div>
        <input
          className="AddPhoto"
          style={{ display: 'none' }}
          type="file"
          onChange={onChangeImage}
          ref={imgRef}
        />
      </div>
    </form>
  );
}

// useEffect(() => {
//   const initialFiles = async () => {
//     setPreview(postData.postImage.map((image) => image.imageUrl));
//     const files = await Promise.all(
//       postData.postImage.map(async (image) => {
//         return convertURLtoFile(image.imageUrl);
//       }),
//     );
//     setImgUrl(files);
//   };

//   initialFiles();
// }, []);

// const convertURLtoFile = async (url, retryLimit = 3, retryDelay = 1000) => {
//   let lastError;
//   for (let attempt = 0; attempt < retryLimit; attempt++) {
//     try {
//       const response = await fetch(url);
//       if (!response.ok) {
//         throw new Error(
//           `네트워크 응답이 올바르지 않습니다: ${response.statusText}`,
//         );
//       }
//       const data = await response.blob();
//       const ext = url.split('.').pop();
//       const filename = url.split('/').pop();
//       const metadata = { type: `image/${ext}` };
//       return new File([data], filename, metadata);
//     } catch (error) {
//       console.error(`file exchange error on attempt ${attempt + 1}: `, error);
//       lastError = error;
//       await new Promise((resolve) => setTimeout(resolve, retryDelay));
//     }
//   }

//   console.error('모든 재시도가 실패했습니다: ', lastError);
//   return null;
// };

// const convertURLtoFile = async (url) => {
//   console.log(url);
//   try {
//     const response = await axios.get(url, {
//       responseType: 'blob', // 파일로 받기 위해 responseType을 'blob'으로 설정
//     });
//
//     const ext = url.split('.').pop();
//     const filename = url.split('/').pop();
//     const metadata = { type: `image/${ext}` };
//
//     return new File([response.data], filename, metadata);
//   } catch (error) {
//     console.error('file exchange error: ', error);
//     return null;
//   }
// };

// const convertURLtoFile = async (url) => {
//   console.log(url);
//   try {
//     const response = await axios.get(url, {
//       responseType: 'blob',
//     });

//     const ext = url.split('.').pop();
//     const filename = url.split('/').pop();
//     const metadata = { type: `image/${ext}` };

//     return new File([response.data], filename, metadata);
//   } catch (error) {
//     if (error.response) {
//       // 서버 응답이 있는 경우
//       console.error('Server responded with a status:', error.response.status);
//     } else if (error.request) {
//       // 요청이 전송되었지만 응답이 없을 경우
//       console.error('Network error: No response received:', error.request);
//     } else {
//       // 요청 설정 중에 발생한 에러
//       console.error('Error setting up the request:', error.message);
//     }
//     return null;
//   }
// };
