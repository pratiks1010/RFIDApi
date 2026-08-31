import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BRAND_LOGO_MARK, BRAND_NAME } from '../../constants/brand';

const ease = [0.16, 1, 0.3, 1];

const AppLogoLoader = ({ visible = false }) => (
  <AnimatePresence>
    {visible ? (
      <motion.div
        className="app-logo-loader"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={`${BRAND_NAME}. Please wait, this may take a moment.`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease }}
      >
        <motion.div
          className="app-logo-loader__panel"
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.38, ease }}
        >
          <div className="app-logo-loader__mark">
            <motion.span
              className="app-logo-loader__spin"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, ease: 'linear', repeat: Infinity }}
            />
            <img src={BRAND_LOGO_MARK} alt={BRAND_NAME} />
          </div>

          <div className="app-logo-loader__copy">
            <p className="app-logo-loader__title">
              Please wait
              <span className="app-logo-loader__dots" aria-hidden="true">
                <i /><i /><i />
              </span>
            </p>
            <p className="app-logo-loader__hint">This may take a moment</p>
          </div>

          <div className="app-logo-loader__bar" aria-hidden="true">
            <motion.span
              animate={{ x: ['-80%', '180%'] }}
              transition={{ duration: 1.15, ease: [0.4, 0, 0.2, 1], repeat: Infinity }}
            />
          </div>
        </motion.div>

        <style>{`
          .app-logo-loader {
            position: fixed;
            inset: 0;
            z-index: 20000;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(59, 130, 246, 0.14);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
          }
          .app-logo-loader__panel {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 14px;
            width: 260px;
            min-width: 260px;
            max-width: 260px;
            flex-shrink: 0;
            padding: 22px 24px 18px;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.94);
            border: 1px solid #e2e8f0;
            box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
            box-sizing: border-box;
          }
          .app-logo-loader__mark {
            position: relative;
            width: 120px;
            height: 120px;
            flex: 0 0 120px;
            border-radius: 50%;
            background: #0b0b0b;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          .app-logo-loader__mark img {
            width: 78px;
            height: auto;
            display: block;
            position: relative;
            z-index: 1;
          }
          .app-logo-loader__spin {
            position: absolute;
            inset: 0;
            border-radius: 50%;
            border: 2px solid transparent;
            border-top-color: #C59D5F;
            border-right-color: rgba(197, 157, 95, 0.25);
            pointer-events: none;
          }
          .app-logo-loader__copy {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }
          .app-logo-loader__title {
            margin: 0;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 15px;
            font-weight: 800;
            color: #1e293b;
            line-height: 1.2;
            white-space: nowrap;
          }
          .app-logo-loader__hint {
            margin: 0;
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            line-height: 1.3;
          }
          .app-logo-loader__dots {
            display: inline-flex;
            gap: 4px;
          }
          .app-logo-loader__dots i {
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: #C59D5F;
            display: block;
            animation: appLogoDot 1.1s ease-in-out infinite;
          }
          .app-logo-loader__dots i:nth-child(2) { animation-delay: 0.14s; }
          .app-logo-loader__dots i:nth-child(3) { animation-delay: 0.28s; }
          .app-logo-loader__bar {
            width: 120px;
            height: 3px;
            border-radius: 99px;
            background: #e2e8f0;
            overflow: hidden;
          }
          .app-logo-loader__bar span {
            display: block;
            width: 40%;
            height: 100%;
            border-radius: 99px;
            background: linear-gradient(90deg, #C59D5F, #E8D5B0, #C59D5F);
          }
          @keyframes appLogoDot {
            0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
            40% { opacity: 1; transform: translateY(-3px); }
          }
        `}</style>
      </motion.div>
    ) : null}
  </AnimatePresence>
);

export default AppLogoLoader;
