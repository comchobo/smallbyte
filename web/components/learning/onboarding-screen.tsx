"use client";

import {
  choices,
  onboardingQuestions,
  type Preferences,
  preferenceKeys,
  preferenceLabel,
  preferenceLabels,
} from "@/lib/learning";

export function OnboardingScreen({
  preferences,
  step,
  busy,
  onStepChange,
  onPreferencesChange,
  onSave,
}: {
  preferences: Preferences;
  step: number;
  busy: boolean;
  onStepChange: (step: number) => void;
  onPreferencesChange: (preferences: Preferences) => void;
  onSave: (preferences: Preferences) => void | Promise<void>;
}) {
  const preferenceStep = preferenceKeys[step];
  return (
    <div className="onboarding">
      <aside className="onboard-aside">
        <h1>나에게 맞는 코스를 만듭니다.</h1>
        <ol className="step-list">
          {preferenceKeys.map((key, i) => (
            <li
              key={key}
              className={i === step ? "current" : i < step ? "done" : ""}
              aria-current={i === step ? "step" : undefined}
            >
              <span className="step-number">{i + 1}</span>
              {preferenceLabels[key]}
            </li>
          ))}
        </ol>
      </aside>
      <form
        className="onboard-panel"
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 2) onStepChange(step + 1);
          else void onSave(preferences);
        }}
      >
        <h2>{onboardingQuestions[step]}</h2>
        <p>가장 가까운 항목을 골라 주세요. 나중에 바꿀 수 있습니다.</p>
        <fieldset className="option-list">
          <legend className="sr-only">
            {preferenceLabels[preferenceStep]}
          </legend>
          {choices[preferenceStep].map(([value, title, desc]) => (
            <label key={value} className="option">
              <input
                type="radio"
                name={preferenceStep}
                value={value}
                checked={preferences[preferenceStep] === value}
                onChange={() =>
                  onPreferencesChange({
                    ...preferences,
                    [preferenceStep]: value,
                  })
                }
                required
              />
              <span>
                <strong>{title}</strong>
                <small>{desc}</small>
              </span>
            </label>
          ))}
        </fieldset>
        {step === 2 && (
          <div className="onboard-summary">
            {preferenceLabel("purpose", preferences.purpose)}
            <br />
            {preferenceLabel("goal", preferences.goal)}
          </div>
        )}
        <div className="onboard-actions">
          {step > 0 && (
            <button
              className="link-button"
              type="button"
              onClick={() => onStepChange(step - 1)}
            >
              이전
            </button>
          )}
          <button className="primary" disabled={busy} type="submit">
            {busy ? "저장 중…" : step === 2 ? "첫 코스 시작하기" : "다음"}
          </button>
        </div>
      </form>
    </div>
  );
}
