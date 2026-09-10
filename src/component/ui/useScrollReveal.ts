import { useEffect } from 'react';

/** One gentle entrance per element; content stays visible without animation support. */
export default function useScrollReveal() {
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!('IntersectionObserver' in window)) return;
    const animations = new Map<Element, Animation>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const animation = animations.get(entry.target);
        if (preference.matches) animation?.cancel();
        else animation?.play();
      }
    }, { threshold: 0, rootMargin: '0px 0px 48px 0px' });
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(element => {
      // Never hide content already on screen (including anchor navigation).
      // Prepare offscreen content first to avoid a visible -> hidden flash.
      if (preference.matches || !element.animate || element.getBoundingClientRect().top < window.innerHeight) return;
      const animation = element.animate([
        { opacity: 0, translate: '-14px 0' },
        { opacity: 1, translate: '0 0' },
      ], { duration: 1500, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both' });
      animation.pause();
      animations.set(element, animation);
      animation.onfinish = () => { animation.cancel(); animations.delete(element); };
      observer.observe(element);
    });
    const revealFocused = (event: FocusEvent) => {
      animations.forEach((animation, element) => {
        if (element.contains(event.target as Node)) { animation.cancel(); observer.unobserve(element); animations.delete(element); }
      });
    };
    document.addEventListener('focusin', revealFocused);
    const cancel = () => { if (preference.matches) animations.forEach(animation => animation.cancel()); };
    preference.addEventListener('change', cancel);
    return () => {
      observer.disconnect();
      document.removeEventListener('focusin', revealFocused);
      preference.removeEventListener('change', cancel);
      animations.forEach(animation => animation.cancel());
    };
  }, []);
}
