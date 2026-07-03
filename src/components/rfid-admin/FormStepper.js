import React from 'react';
import { FaCheck } from 'react-icons/fa';

const FormStepper = ({ steps, current, onStepClick }) => (
  <div className="rfid-stepper">
    {steps.map((label, i) => {
      const done = i < current;
      const active = i === current;
      const clickable = i <= current;
      return (
        <React.Fragment key={label}>
          {i > 0 && <div className={`rfid-stepper-line${done ? ' done' : ''}`} aria-hidden />}
          <button
            type="button"
            className={`rfid-stepper-item${done ? ' done' : ''}${active ? ' active' : ''}`}
            onClick={() => clickable && onStepClick?.(i)}
            disabled={!clickable || !onStepClick}
            aria-current={active ? 'step' : undefined}
          >
            <span className="rfid-stepper-circle">
              {done ? <FaCheck size={11} aria-hidden /> : i + 1}
            </span>
            <span className="rfid-stepper-label">{label}</span>
          </button>
        </React.Fragment>
      );
    })}
  </div>
);

export default FormStepper;
