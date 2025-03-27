import React from 'react';
import GitHubButton from 'react-github-btn';

const SocialLinks = () => (
  <div className="flex items-center justify-center mt-3 space-x-2 p-2">
    <GitHubButton
      href="https://github.com/mkcfdc/AISearch"
      data-color-scheme="no-preference: dark; light: dark; dark: dark;"
      data-icon="octicon-star"
      data-size="large"
      data-show-count="true"
      aria-label="Star mkcfdc/AISearch on GitHub"
    >
      Star
    </GitHubButton>

    <GitHubButton
      href="https://github.com/mkcfdc/AISearch/issues"
      data-color-scheme="no-preference: dark; light: dark; dark: dark;"
      data-icon="octicon-issue-opened"
      data-size="large"
      aria-label="Issue mkcfdc/AISearch on GitHub"
    >
      Issue
    </GitHubButton>

    <GitHubButton
      href="https://github.com/mkcfdc"
      data-color-scheme="no-preference: dark; light: dark; dark: dark;"
      data-size="large"
      aria-label="Follow @mkcfdc on GitHub"
    >
      Follow @mkcfdc
    </GitHubButton>

    <a
      href="https://ko-fi.com/mkcfdc"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center transition duration-300 hover:opacity-80 py-3 px-4"
    >
      <img
        src="https://cdn.ko-fi.com/cdn/kofi2.png?v=3"
        alt="Support me on Ko-fi"
        className="w-32"
      />
    </a>
  </div>
);

export default SocialLinks;
