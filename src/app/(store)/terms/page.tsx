// src/app/(store)/terms/page.tsx
import { pageMetadata } from '@/lib/seo';
import { LegalPage, LegalSection } from '@/components/store/legal-page';

export const metadata = pageMetadata({
  title: 'Terms of service',
  description:
    'The terms that apply when you browse, order and pay at Harmattan Books - ordering, delivery, refunds and accounts.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      intro="The short version: we sell you real books at the listed price, deliver them where you tell us, and refund you when something goes wrong. The longer version follows."
      updated="27 July 2026"
    >
      <LegalSection heading="Ordering and prices">
        <p>
          All prices are in Ghana cedis (GHS) and include what it costs to put the book in your
          hands, except delivery, which is shown separately at checkout. Delivery in Tamale is free
          on orders over GH₵250. An order is confirmed once your payment succeeds; until then,
          nothing is reserved.
        </p>
        <p>
          Stock is finite - occasionally a title sells out between your basket and your payment. If
          that happens the checkout will tell you before any money moves.
        </p>
      </LegalSection>

      <LegalSection heading="Payment">
        <p>
          Payments are handled by Paystack and support cards, mobile money and bank transfer. Your
          payment details never reach our servers. Totals - including any promotional discount and
          the delivery fee - are computed by us at payment time; the amount shown on the Paystack
          page is the amount you pay.
        </p>
      </LegalSection>

      <LegalSection heading="Delivery">
        <p>
          Orders placed before 2pm ship the same day from Tamale. Delivery within Tamale usually
          takes 1-2 days and nationwide 2-4 days. These are honest estimates, not promises - roads
          are roads. You can follow your order any time with its order ID on the track-order page,
          or from your account.
        </p>
      </LegalSection>

      <LegalSection heading="Cancellations and refunds">
        <p>
          An order can be cancelled while it is still pending or paid but not yet shipped - write to
          us or, if you have an account, contact us with the order ID. Cancelled orders are refunded
          in full through Paystack to the payment method you used, and the copies go back on the
          shelf. Once an order has shipped it can no longer be cancelled, but if a book arrives
          damaged we will replace it or refund it - tell us within 7 days of delivery.
        </p>
      </LegalSection>

      <LegalSection heading="Promotional codes">
        <p>
          Promo codes apply only while they are live, may be limited to a particular shelf, cannot
          be exchanged for cash and cannot be combined. We may pause or withdraw a code at any time;
          orders already paid keep the discount they were charged with.
        </p>
      </LegalSection>

      <LegalSection heading="Your account">
        <p>
          You are responsible for keeping your password to yourself and for what happens under your
          account. We recommend enabling two-factor authentication from your account&apos;s security tab.
          Give us accurate delivery details - we deliver to what you type.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>
          Do not attempt to interfere with the shop&apos;s operation, probe other customers&apos; data, abuse
          promotional codes, or place orders with details that are not yours to use. We may refuse
          or cancel orders and close accounts involved in any of that.
        </p>
      </LegalSection>

      <LegalSection heading="The legal frame">
        <p>
          These terms are governed by the laws of the Republic of Ghana. Nothing in them limits the
          rights you have under Ghanaian consumer-protection law. If any clause turns out to be
          unenforceable, the rest still stand. We may update these terms; the date above always
          tells you when we last did.
        </p>
        <p>
          Harmattan Books, Aboabo Market Road, Tamale, Northern Region, Ghana ·
          hello@harmattanbooks.com
        </p>
      </LegalSection>
    </LegalPage>
  );
}
