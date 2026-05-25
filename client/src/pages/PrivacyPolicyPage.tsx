import { useLocation } from "wouter";
import { Layout } from "../components/Layout";
import { H3 } from "../components/Typography";

export const PrivacyPolicyPage = () => {
  const [, navigate] = useLocation();

  return (
    <Layout title="">
      <div className="p-2 flex flex-col gap-4 w-full md:w-3/4 xl:w-2/3 2xl:w-2/3 md:mr-auto md:ml-auto">
        <div className="mt-8 mb-4">
          <H3>AISysRev Register and Privacy Policy</H3>
        </div>
        <p className="text-base text-gray-700">
          The purpose of the register and privacy policy is to describe the
          processing of personal data by the controller. Personal data is
          processed in accordance with applicable EU and national legislation
          and the regulations and guidelines issued thereunder.
        </p>

        <section className="flex flex-col gap-1">
          <h4 className="font-semibold text-gray-800">The name of the register</h4>
          <p className="text-base text-gray-700">AISysRev</p>
        </section>

        <section className="flex flex-col gap-1">
          <h4 className="font-semibold text-gray-800">The Controller</h4>
          <p className="text-base text-gray-700">
            Helsingin yliopisto, Tietojenkäsittelytieteen osasto
            <br />
            PL 68 (Pietari Kalmin katu 5) 00014 HELSINGIN YLIOPISTO
          </p>
        </section>

        <section className="flex flex-col gap-1">
          <h4 className="font-semibold text-gray-800">Data protection liaison</h4>
          <p className="text-base text-gray-700">
            Mika Mäntylä, mika.mantyla@helsinki.fi
          </p>
        </section>

        <section className="flex flex-col gap-1">
          <h4 className="font-semibold text-gray-800">
            Purpose of the processing of personal data
          </h4>
          <p className="text-base text-gray-700">
            Personal data stored in the customer register is used to verify
            users identities and access rights.
          </p>
        </section>

        <section className="flex flex-col gap-1">
          <h4 className="font-semibold text-gray-800">Information in the register</h4>
          <p className="text-base text-gray-700">Personal information:</p>
          <ul className="list-disc list-inside text-base text-gray-700">
            <li>Email</li>
            <li>University of Helsinki user identifier</li>
          </ul>
        </section>

        <section className="flex flex-col gap-1">
          <h4 className="font-semibold text-gray-800">Regular data sources</h4>
          <p className="text-base text-gray-700">
            Data is collected automatically when the user logs in via University
            of Helsinki's login service (OIDC).
          </p>
        </section>

        <section className="flex flex-col gap-1">
          <h4 className="font-semibold text-gray-800">Disclosure of information</h4>
          <p className="text-base text-gray-700">
            The information will not be disclosed to outside parties. Personal
            data will not be transferred outside the EU or EEA.
          </p>
        </section>

        <section className="flex flex-col gap-1">
          <h4 className="font-semibold text-gray-800">
            Register security principles
          </h4>
          <p className="text-base text-gray-700">
            Personal data contained in the register is kept confidential. Access
            to the register is restricted so that information stored in the
            system can only be accessed and used by persons who are entitled to
            do so by virtue of their duties and who need the data in their work.
            Staff handling personal data are bound by a duty of confidentiality.
          </p>
          <p className="text-base text-gray-700">
            Daily backups are taken of the system's components, which are
            encrypted and stored in a secure location. Backups are stored only
            as long as it is necessary to recover the system in case of a system
            failure or malfunction.
          </p>
        </section>

        <section className="flex flex-col gap-1">
          <h4 className="font-semibold text-gray-800">
            Right of inspection and right to request rectification of data
          </h4>
          <p className="text-base text-gray-700">
            As a user, you have the right to access personal data concerning
            you, including the right to receive a copy of your personal data.
            Information will be provided in an intelligible format and always in
            writing. Requests can be directed to the data protection liaison
            listed above.
          </p>
        </section>

        <div className="mb-8">
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-gray-500 hover:text-gray-800 underline"
          >
            Back to login
          </button>
        </div>
      </div>
    </Layout>
  );
};
