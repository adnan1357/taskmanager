import React, { useRef, useState, useEffect } from 'react';

interface VerificationCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [code, setCode] = useState<string[]>(Array(6).fill('').map((_, i) => value[i] || ''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, 6);
  }, []);

  // Update local state when the value prop changes
  useEffect(() => {
    if (value !== code.join('')) {
      setCode(Array(6).fill('').map((_, i) => value[i] || ''));
    }
  }, [value]);

  // When code array changes, update the parent component
  useEffect(() => {
    const newValue = code.join('');
    if (newValue !== value) {
      onChange(newValue);
    }
  }, [code, onChange, value]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // Only allow numbers
    if (!/^\d*$/.test(val)) return;
    
    // Take the last character if the user somehow enters multiple
    const digit = val.slice(-1);
    
    // Create new array with the updated digit
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    
    // If we entered a digit and there's a next input, focus on it
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        // If current input is empty and backspace is pressed, focus on previous input
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
        inputRefs.current[index - 1]?.focus();
      } else if (code[index]) {
        // If current input has a value, clear it
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    }
    
    // Handle left arrow key
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Handle right arrow key
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    
    // Only continue if we have pasted data and it's numeric
    if (!pastedData || !/^\d+$/.test(pastedData)) return;
    
    // Take up to 6 digits
    const digits = pastedData.slice(0, 6).split('');
    
    // Fill in as many inputs as we have digits
    const newCode = [...code];
    digits.forEach((digit, index) => {
      if (index < 6) {
        newCode[index] = digit;
      }
    });
    
    setCode(newCode);
    
    // Focus on the next empty input or the last input
    const nextEmptyIndex = newCode.findIndex(val => !val);
    if (nextEmptyIndex !== -1 && nextEmptyIndex < 6) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center w-full">
      {Array(6).fill(null).map((_, index) => (
        <input
          key={index}
          ref={el => inputRefs.current[index] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={code[index]}
          onChange={e => handleChange(index, e)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined}
          disabled={disabled}
          className="w-12 h-14 text-center text-xl font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          autoComplete="off"
          aria-label={`Verification code digit ${index + 1}`}
        />
      ))}
    </div>
  );
};

export default VerificationCodeInput; 