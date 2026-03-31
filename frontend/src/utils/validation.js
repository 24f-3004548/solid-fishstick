/**
 * Form Validation Utilities
 */

const FormValidation = {
  /**
   * Validate email format
   */
  validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  /**
   * Validate password strength
   * Rules: 6+ chars, alphanumeric only
   */
  validatePassword(password) {
    const minLength = password.length >= 6;
    const isAlphanumeric = /^[A-Za-z0-9]+$/.test(password);

    return {
      isValid: minLength && isAlphanumeric,
      feedback: {
        minLength: { met: minLength, label: "At least 6 characters" },
        isAlphanumeric: { met: isAlphanumeric, label: "Only letters and numbers" },
      },
    };
  },

  /**
   * Validate passwords match
   */
  passwordsMatch(password, confirmPassword) {
    return password === confirmPassword;
  },

  /**
   * Validate form field
   */
  validateField(field, value, rules = {}) {
    const errors = [];

    if (rules.required && !value?.trim()) {
      errors.push(`${field} is required`);
    }

    if (rules.type === 'email' && value && !this.validateEmail(value)) {
      errors.push('Invalid email format');
    }

    if (rules.type === 'password' && value) {
      const validation = this.validatePassword(value);
      if (!validation.isValid) {
        errors.push('Password must be alphanumeric and at least 6 characters');
      }
    }

    if (rules.minLength && value && value.length < rules.minLength) {
      errors.push(`Minimum ${rules.minLength} characters required`);
    }

    if (rules.maxLength && value && value.length > rules.maxLength) {
      errors.push(`Maximum ${rules.maxLength} characters allowed`);
    }

    return errors;
  },

  /**
   * Validate entire form
   */
  validateForm(formData, schema) {
    const errors = {};
    Object.entries(schema).forEach(([field, rules]) => {
      const fieldErrors = this.validateField(field, formData[field], rules);
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    });
    return errors;
  },
};
