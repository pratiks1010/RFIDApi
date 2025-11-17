import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import styled from '@emotion/styled';

const NotificationWrapper = styled(motion.div)`
  position: fixed;
  top: 24px;
  right: 24px;
  background: #ffffff;
  border-radius: 8px;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  border-left: 4px solid #2D9CDB;
`;

const IconWrapper = styled.div`
  color: #2D9CDB;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MessageWrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

const Title = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #2D3E50;
  margin-bottom: 2px;
`;

const Message = styled.div`
  font-size: 13px;
  color: #7F8B9A;
`;

const SuccessNotification = ({ title, message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <NotificationWrapper
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <IconWrapper>
            <CheckCircleIcon />
          </IconWrapper>
          <MessageWrapper>
            <Title>{title}</Title>
            <Message>{message}</Message>
          </MessageWrapper>
        </NotificationWrapper>
      )}
    </AnimatePresence>
  );
};

export default SuccessNotification; 