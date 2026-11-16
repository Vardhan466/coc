import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
  inline?: boolean;
}

/**
 * Tokenizes text containing $...$ or $$...$$ formulas and renders them with KaTeX.
 * Memoized to eliminate costly DOM recalculations during rapid question palette navigation.
 */
function renderMathString(text: string): string {
  if (!text) return '';
  if (!text.includes('$')) {
    return text;
  }

  // Replace $$...$$ block math first
  let processed = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return `$$${math}$$`;
    }
  });

  // Replace $...$ inline math next
  processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return `$${math}$`;
    }
  });

  return processed;
}

export const MathRenderer: React.FC<MathRendererProps> = React.memo(
  ({ content, className = '', inline = false }) => {
    const renderedHtml = useMemo(() => {
      return renderMathString(content);
    }, [content]);

    if (!content.includes('$')) {
      return <span className={className}>{content}</span>;
    }

    if (inline) {
      return (
        <span
          className={`inline-math-container ${className}`}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      );
    }

    return (
      <div
        className={`math-block-container ${className}`}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    );
  },
  (prevProps, nextProps) => {
    // Custom shallow equality comparison for zero-cost memoization
    return (
      prevProps.content === nextProps.content &&
      prevProps.className === nextProps.className &&
      prevProps.inline === nextProps.inline
    );
  }
);
