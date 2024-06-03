import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
//import axios from 'axios';
import * as StompJs from '@stomp/stompjs';
import '../../styles/pages/Chat/ChattingPage.scss';
import BackIcon from '../../assets/svgs/BackIcon';
import basicProfile from '../../assets/images/basicProfile.jpg';
import '../../styles/component/TextInput.scss';
import Exit from '../../assets/svgs/Exit.svg';
import { NotificationIcon } from '../../assets/svgs/NotificationIcon';
import Modal from '../../components/Modal/Modal';
import axios from 'axios';
import api from '../../utils/api';

const ChattingPage = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [client, setClient] = useState(null);
  const [chatData, setChatData] = useState({});
  const [chat, setChat] = useState('');
  const { state } = useLocation();
  const userProfile = JSON.parse(sessionStorage.getItem('myInfo'));
  const [isValid, setIsValid] = useState(false);
  const [isChatDeclarationActive, setIsChatDeclarationActive] = useState(false);
  const [isChatRoomExit, setIsChatRoomExit] = useState(false);
  const [page, setPage] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const NEW_URL = import.meta.env.VITE_ENDPOINT;

  const getCurrentDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (state?.chatRoom?.chatRoomInfo?.chatRoomId) {
      getData();
    }
  }, [state?.chatRoom?.chatRoomInfo?.chatRoomId, page]);

  const getData = async () => {
    try {
      const response = await axios.get(
        `${NEW_URL}/api/v1/chat/list/${state?.chatRoom?.chatRoomInfo?.chatRoomId}`,
        {
          params: { page },
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Cache-Control': 'no-cache',
          },
        },
      );
      console.log(response);
      const newData = response.data.data;

      if (newData && typeof newData === 'object') {
        setChatData((prevChatData) => {
          const mergedData = { ...prevChatData };
          Object.keys(newData).forEach((date) => {
            if (mergedData[date]) {
              mergedData[date] = [...newData[date], ...mergedData[date]];
            } else {
              mergedData[date] = newData[date];
            }
          });
          return mergedData;
        });
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      if (error.response && error.response.status === 401) {
        console.error('Unauthorized: Access token is invalid or expired.');
        // navigate('/login');
      }
    }
  };

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [state]);

  useEffect(() => {
    const currentDate = getCurrentDate();
    const currentChatData = chatData[currentDate];
    if (currentChatData && currentChatData.length > 0) {
      const lastMessage = currentChatData[currentChatData.length - 1];
      if (lastMessage.sender === userProfile.profileInfo.nickname) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
    }
  }, [chatData]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [chatData]);

  const connect = () => {
    if (isConnected || !state?.chatRoom?.chatRoomInfo?.chatRoomId) {
      console.log('Already connected or chatRoomId not provided.');
      return;
    }
    try {
      const clientInstance = new StompJs.Client({
        webSocketFactory: () =>
          new WebSocket(import.meta.env.VITE_WEBSOCKET_URL),
        brokerURL: import.meta.env.VITE_WEBSOCKET_URL,
        connectHeaders: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
        },
        debug: (str) => console.log(str),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      clientInstance.onConnect = () => {
        setIsConnected(true);
        clientInstance.subscribe(
          `${import.meta.env.VITE_SUB}${state.chatRoom.chatRoomInfo.chatRoomId}`,
          (message) => {
            if (message.body) {
              const msgObject = JSON.parse(message.body);
              addNewMessage(msgObject.data);
            }
          },
        );
      };

      clientInstance.activate();
      setClient(clientInstance);
    } catch (err) {
      console.error('WebSocket connection error:', err);
    }
  };

  const addNewMessage = (newMessage) => {
    const today = new Date();
    today.setHours(today.getHours());
    const newTime = today.toISOString().split('T')[0];
    setChatData((prevChatData) => {
      if (prevChatData[newTime]) {
        return {
          ...prevChatData,
          [newTime]: [...prevChatData[newTime], newMessage],
        };
      } else {
        return { ...prevChatData, [newTime]: [newMessage] };
      }
    });
  };

  const disconnect = () => {
    if (client) client.deactivate();
    setIsConnected(false);
  };

  const sendChat = () => {
    if (chat.trim() && client) {
      client.publish({
        destination: `${import.meta.env.VITE_PUB}${state.chatRoom.chatRoomInfo.chatRoomId}`,
        body: JSON.stringify({
          roomId: state.chatRoom.chatRoomInfo.chatRoomId,
          sender: userProfile.profileInfo.nickname,
          message: chat,
          createdAt: new Date().toISOString(),
        }),
      });
      setChat('');
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const formatTime = (time) => {
    const date = new Date(time);
    let hours = date.getHours() + 9;
    const minutes = date.getMinutes().toString().padStart(2, '0');
    hours = hours % 12 || 12;
    const amOrPm = hours >= 12 ? 'PM' : 'AM';
    return `${hours}:${minutes} ${amOrPm}`;
  };

  const handleChange = (e) => {
    const newComment = e.target.value;
    setChat(newComment);
    setIsValid(newComment.length > 0);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendChat();
  };

  const observer = useRef();

  useEffect(() => {
    const handleIntersection = (entries) => {
      const target = entries[0];
      if (target.isIntersecting) {
        setPage((prevPage) => prevPage + 1);
      }
    };

    observer.current = new IntersectionObserver(handleIntersection, {
      threshold: 0.5,
    });

    if (messagesEndRef.current) {
      observer.current.observe(messagesEndRef.current);
    }

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [messagesEndRef]);

  const sortedDates = Object.keys(chatData).sort(
    (a, b) => new Date(a) - new Date(b),
  );
  const sortedChatData = sortedDates.reduce((acc, date) => {
    acc[date] = chatData[date].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );
    return acc;
  }, {});

  return (
    <>
      <div className="ChatPage_Header">
        <div
          className="ChatPage_Header_BackButton"
          onClick={() => navigate(-1)}
        >
          <BackIcon />
        </div>
        <div className="ChatPage_Header_TextBox">
          <div className="ChatPage_Header_TextBox_Title">
            {state?.chatRoom?.chatRoomInfo?.title || 'Chat Room'}
          </div>

          <div className="ChatPage_Header_TextBox_MemberCount">
            {state?.chatRoom?.chatRoomInfo?.memberCount || 0}명
          </div>
        </div>
        <div className="ChatPage_Header_IconBox">
          <div onClick={() => setIsChatRoomExit(true)}>
            <img
              src={Exit}
              style={{ width: '30px', height: '30px' }}
              alt="Exit Icon"
            />
          </div>
          <div onClick={() => setIsChatDeclarationActive(true)}>
            <NotificationIcon />
          </div>
        </div>
      </div>
      {isChatDeclarationActive && (
        <Modal
          actionType="Declaration"
          type="CHAT"
          title="채팅방을 신고 하시겠습니까?"
          body="신고 접수 확인 후, 조치하겠습니다."
          setIsActive={setIsChatDeclarationActive}
          id={state?.chatRoom?.chatRoomInfo?.chatRoomId}
        />
      )}
      {isChatRoomExit && (
        <Modal
          actionType="Delete"
          type="CHAT"
          title="채팅방을 퇴장 하시겠습니까?"
          body={
            <span>
              퇴장하시고 재입장 시,
              <br />
              채팅 기록이 복구되지 않습니다.
            </span>
          }
          setIsActive={setIsChatRoomExit}
          id={state?.chatRoom?.chatRoomInfo?.chatRoomId}
        />
      )}
      <div className="ChatPage_Container">
        <div className="ChatPage_Wrapper">
          {Object.entries(sortedChatData).map(([date, chatData]) => (
            <div key={date}>
              <div className="ChatPage_Date">{date}</div>

              {chatData.map((msgObject, index) => (
                <div key={index}>
                  {msgObject.messageType === 'ENTER' ? (
                    <div className="ChatPage_EnterMessage">
                      <div>{msgObject.sender}님이 입장하셨습니다.</div>
                    </div>
                  ) : userProfile.profileInfo.nickname === msgObject.sender ? (
                    <div className="ChatPage_MyContentContainer">
                      <div className="ChatPage_MessageBox_MyNickname">
                        {msgObject.sender}
                        <img
                          src={
                            userProfile.profileImage !== null
                              ? userProfile.profileImage.imageUrl
                              : basicProfile
                          }
                          className="ChatPage_MessageBox_MyProfile"
                          alt="My Profile"
                        />
                      </div>
                      <div style={{ display: 'flex' }}>
                        <div className="ChatPage_ContentBox_MyTime">
                          {formatTime(msgObject.createdAt)}
                        </div>
                        <div className="ChatPage_ContentBox_MyContent">
                          {msgObject.msg}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="ChatPage_ContentContainer">
                      <div className="ChatPage_MessageBox_OtherNickname">
                        <img
                          src={
                            msgObject.senderProfile !== null
                              ? msgObject.senderProfile
                              : basicProfile
                          }
                          className="ChatPage_MessageBox_OtherProfile"
                          alt="Other Profile"
                        />
                        {msgObject.sender}
                      </div>
                      <div style={{ display: 'flex' }}>
                        <div className="ChatPage_ContentBox_OtherContent">
                          {msgObject.msg}
                        </div>
                        <div className="ChatPage_ContentBox_OtherTime">
                          {formatTime(msgObject.createdAt)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div ref={messagesEndRef}></div>
      </div>
      <form className="textContainer" onSubmit={handleSubmit}>
        <input
          type="text"
          id="msg"
          value={chat}
          className="comment-input"
          onChange={handleChange}
          placeholder="텍스트를 입력해주세요."
        />
        <button
          type="submit"
          className="Textcheck"
          onClick={sendChat}
          style={{
            background: isValid ? '#4D8AEB 50%' : '#4D8AEB 99.25%',
            border: 'none',
          }}
        >
          전송
        </button>
      </form>
    </>
  );
};

export default ChattingPage;