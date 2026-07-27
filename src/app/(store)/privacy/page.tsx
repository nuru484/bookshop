// src/app/(store)/privacy/page.tsx
import { pageMetadata } from '@/lib/seo';
import { LegalPage, LegalSection } from '@/components/store/legal-page';

export const metadata = pageMetadata({
  title: 'Privacy policy',
  description:
    'How Harmattan Books collects, uses and protects your information when you browse, order and create an account.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro="We are a small bookshop, and we treat your information the way we treat our stock: carefully, and only for what it's actually for."
      updated="27 July 2026"
    >
      <LegalSection heading="What we collect">
        <p>
          <strong>Account details.</strong> When you create an account we store your name, email
          address, password (hashed, never readable by us) and, if you add them, your phone number,
          delivery address and profile photo.
        </p>
        <p>
          <strong>Order details.</strong> When you place an order, with or without an account, we
          store your name, email, phone number, delivery address, the items ordered and the order
          total, so we can deliver your books and answer questions about the order.
        </p>
        <p>
          <strong>Payments.</strong> Payments are processed by Paystack. Your card or mobile-money
          details go directly to Paystack over their secure checkout - we never see or store them.
          We keep only the payment reference and its status.
        </p>
        <p>
          <strong>Wishlist and searches.</strong> Your wishlist is stored on your account when you
          are signed in and only in your own browser when you are not. Search terms are recorded in
          aggregate (the term and how often it is searched, never who searched it) to power the
          popular-searches list.
        </p>
        <p>
          <strong>Cookies.</strong> We use a single session cookie to keep you signed in. There are
          no advertising or cross-site tracking cookies.
        </p>
      </LegalSection>

      <LegalSection heading="How we use it">
        <p>
          To fulfil and deliver orders, to let you track them, to send order confirmations and
          delivery updates by email and SMS, to keep your account working (including sign-in codes
          when two-factor authentication is on), and to keep the shop stocked with what people
          actually read. We do not sell or rent your information to anyone.
        </p>
      </LegalSection>

      <LegalSection heading="Who helps us">
        <p>A few carefully chosen services process data on our behalf:</p>
        <p>
          <strong>Paystack</strong> processes payments and refunds. <strong>Frog (Wigal)</strong>{' '}
          delivers our SMS notifications to your phone number. <strong>Cloudinary</strong> hosts
          profile photos you upload. <strong>Google (Gmail)</strong> delivers our emails. Each
          receives only what it needs for its job.
        </p>
      </LegalSection>

      <LegalSection heading="How long we keep it">
        <p>
          Order records are kept for as long as we are required to for accounting purposes. Account
          details are kept until you ask us to delete your account. Aggregated search terms carry no
          personal information and are kept indefinitely.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          You can see and correct your details any time from your account page, including removing
          your profile photo. To request a copy of your data or the deletion of your account, write
          to <strong>hello@harmattanbooks.com</strong> from the email on the account and we will
          sort it out within 14 days.
        </p>
      </LegalSection>

      <LegalSection heading="Questions">
        <p>
          Harmattan Books, Aboabo Market Road, Tamale, Northern Region, Ghana ·
          hello@harmattanbooks.com. If anything here is unclear, ask - a human answers.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
