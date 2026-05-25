import type { Locale } from "./domain";
import { brand } from "./brand";

export type LegalPageKey =
  | "terms"
  | "privacy"
  | "code-of-conduct"
  | "moderation";

type LegalSection = {
  title: string;
  body: string[];
};

type LegalPage = {
  title: string;
  description: string;
  updated: string;
  sections: LegalSection[];
};

const updated = "2026-05-23";

export const legalPages: Record<Locale, Record<LegalPageKey, LegalPage>> = {
  en: {
    terms: {
      title: "Terms of Service",
      description:
        "The working rules for using RubberDuck while it moves through beta and toward public launch.",
      updated,
      sections: [
        {
          title: "Status",
          body: [
            `${brand.productName} is a developer social network for posts, project collaboration, RSS discovery, and executable course content. These terms are an operational draft until final legal review is complete.`,
            "Do not use the service to attack systems, publish malware, impersonate others, violate intellectual property, or evade moderation controls.",
          ],
        },
        {
          title: "Accounts",
          body: [
            "You are responsible for activity under your account and for keeping provider credentials secure.",
            "OAuth and email sign-in must not be used to create abusive, fraudulent, or automated accounts.",
          ],
        },
        {
          title: "Content",
          body: [
            "You retain ownership of content you publish, but grant RubberDuck the rights needed to host, display, moderate, share, and index it inside the product.",
            "Course code, notebook cells, posts, embeds, and uploaded media must be content you own, have permission to use, or can lawfully share.",
          ],
        },
        {
          title: "Execution Sandbox",
          body: [
            "Browser-side Python execution is provided for learning and validation, not for untrusted production workloads.",
            "Heavy, networked, GPU, or privileged execution requires a separate managed runtime and security model.",
          ],
        },
        {
          title: "Changes",
          body: [
            "These terms may be updated as the product leaves beta, adds paid services, or changes infrastructure providers.",
          ],
        },
      ],
    },
    privacy: {
      title: "Privacy Policy",
      description:
        "How RubberDuck handles profile, activity, course, analytics, and moderation data.",
      updated,
      sections: [
        {
          title: "Data We Process",
          body: [
            "RubberDuck stores account identity, profile settings, posts, comments, project signals, course drafts, course progress, saves, Thanks, reports, notifications, uploads, and operational logs.",
            "User-created content may be public, follower-visible, or private depending on product privacy settings and feature semantics.",
          ],
        },
        {
          title: "Analytics and Observability",
          body: [
            "PostHog may be used for product analytics, and Sentry may be used for error monitoring. Configuration should minimize personal data and disable unnecessary replay by default.",
            "Server actions may emit operational events for abuse prevention, debugging, reliability, and product quality.",
          ],
        },
        {
          title: "Retention and Deletion",
          body: [
            "Users can request or trigger account export and deletion where supported by the product UI.",
            "Some records may be retained when legally required or when needed for security, audit, fraud prevention, or abuse investigations.",
          ],
        },
        {
          title: "Processors",
          body: [
            "Expected processors include Vercel, Neon, Cloudflare, Sentry, PostHog, OAuth providers, and the configured email provider.",
            "The final public launch requires a verified subprocessor list and legal contact address.",
          ],
        },
      ],
    },
    "code-of-conduct": {
      title: "Code of Conduct",
      description:
        "The community standard for useful, technical, non-toxic collaboration.",
      updated,
      sections: [
        {
          title: "Expected Behavior",
          body: [
            "Be direct, technical, respectful, and useful. Assume people are here to learn, build, debug, and improve real projects.",
            "Prefer actionable feedback over vague criticism. No downvotes or public rejection counters are part of the product culture.",
          ],
        },
        {
          title: "Unacceptable Behavior",
          body: [
            "Harassment, hate, targeted abuse, spam, malicious code, deceptive project claims, and doxxing are not allowed.",
            "Do not pressure users to share private credentials, sensitive code, or non-public project information.",
          ],
        },
        {
          title: "Enforcement",
          body: [
            "Reports are private. Moderation decisions should preserve safety without creating public pile-ons.",
            "Repeated or severe violations may lead to content removal, account restrictions, suspension, or ban.",
          ],
        },
      ],
    },
    moderation: {
      title: "Moderation Policy",
      description:
        "How reports, enforcement, appeals, and operational safety should work.",
      updated,
      sections: [
        {
          title: "Private Reports",
          body: [
            "Reports are silent and private by design. The product must not expose public accusation counters.",
            "Moderators review reported posts, comments, courses, project signals, and uploads with context and auditability.",
          ],
        },
        {
          title: "Actions",
          body: [
            "Available actions include no action, content restore, content hide, warning, temporary restriction, suspension, and ban as the admin tooling matures.",
            "High-risk URLs, uploads, and executable content should receive stricter review before broad distribution.",
          ],
        },
        {
          title: "Appeals",
          body: [
            "A final appeals email must be configured before public launch.",
            "Appeals should be reviewed by someone other than the original moderator when possible.",
          ],
        },
      ],
    },
  },
  es: {
    terms: {
      title: "Terminos de Servicio",
      description:
        "Reglas operativas para usar RubberDuck durante beta y camino al lanzamiento publico.",
      updated,
      sections: [
        {
          title: "Estado",
          body: [
            `${brand.productName} es una red social para desarrolladores con publicaciones, colaboracion en proyectos, descubrimiento RSS y cursos ejecutables. Estos terminos son un borrador operativo hasta la revision legal final.`,
            "No uses el servicio para atacar sistemas, publicar malware, suplantar personas, violar propiedad intelectual o evadir moderacion.",
          ],
        },
        {
          title: "Cuentas",
          body: [
            "Eres responsable de la actividad de tu cuenta y de mantener seguras tus credenciales de proveedor.",
            "El inicio de sesion OAuth o por email no debe usarse para crear cuentas abusivas, fraudulentas o automatizadas.",
          ],
        },
        {
          title: "Contenido",
          body: [
            "Conservas la propiedad del contenido que publicas, pero otorgas a RubberDuck los derechos necesarios para alojarlo, mostrarlo, moderarlo, compartirlo e indexarlo dentro del producto.",
            "Codigo de cursos, celdas notebook, posts, embeds y archivos subidos deben ser propios, autorizados o legalmente compartibles.",
          ],
        },
        {
          title: "Sandbox de Ejecucion",
          body: [
            "La ejecucion Python en navegador sirve para aprendizaje y validacion, no para workloads productivos no confiables.",
            "Ejecucion pesada, con red, GPU o privilegios requiere un runtime gestionado separado y otro modelo de seguridad.",
          ],
        },
        {
          title: "Cambios",
          body: [
            "Estos terminos pueden actualizarse cuando el producto salga de beta, agregue servicios pagos o cambie proveedores de infraestructura.",
          ],
        },
      ],
    },
    privacy: {
      title: "Politica de Privacidad",
      description:
        "Como RubberDuck maneja datos de perfil, actividad, cursos, analitica y moderacion.",
      updated,
      sections: [
        {
          title: "Datos que Procesamos",
          body: [
            "RubberDuck guarda identidad de cuenta, perfil, posts, comentarios, Project Signals, borradores de cursos, progreso, guardados, Thanks, reportes, notificaciones, uploads y logs operativos.",
            "El contenido de usuarios puede ser publico, visible para seguidores o privado segun la configuracion y semantica de cada feature.",
          ],
        },
        {
          title: "Analitica y Observabilidad",
          body: [
            "PostHog puede usarse para analitica de producto y Sentry para monitoreo de errores. La configuracion debe minimizar datos personales y desactivar replay innecesario por defecto.",
            "Las acciones server-side pueden emitir eventos operativos para prevenir abuso, depurar, mejorar confiabilidad y calidad del producto.",
          ],
        },
        {
          title: "Retencion y Eliminacion",
          body: [
            "Los usuarios pueden solicitar o iniciar exportacion y eliminacion de cuenta cuando la UI lo soporte.",
            "Algunos registros pueden retenerse cuando sea legalmente requerido o necesario para seguridad, auditoria, fraude o investigaciones de abuso.",
          ],
        },
        {
          title: "Procesadores",
          body: [
            "Los procesadores esperados incluyen Vercel, Neon, Cloudflare, Sentry, PostHog, proveedores OAuth y el proveedor de email configurado.",
            "El lanzamiento publico requiere lista final de subprocesadores y email legal verificado.",
          ],
        },
      ],
    },
    "code-of-conduct": {
      title: "Codigo de Conducta",
      description:
        "Estandar comunitario para colaboracion tecnica, util y no toxica.",
      updated,
      sections: [
        {
          title: "Comportamiento Esperado",
          body: [
            "Se directo, tecnico, respetuoso y util. La comunidad esta para aprender, construir, depurar y mejorar proyectos reales.",
            "Prefiere feedback accionable sobre critica vaga. El producto no usa downvotes ni contadores publicos de rechazo.",
          ],
        },
        {
          title: "Comportamiento No Aceptado",
          body: [
            "No se permite acoso, odio, abuso dirigido, spam, codigo malicioso, claims enganosos de proyectos ni doxxing.",
            "No presiones a usuarios para compartir credenciales, codigo sensible o informacion privada de proyectos.",
          ],
        },
        {
          title: "Aplicacion",
          body: [
            "Los reportes son privados. Las decisiones de moderacion deben proteger sin crear ataques publicos.",
            "Violaciones repetidas o graves pueden implicar remocion de contenido, restricciones, suspension o baneo.",
          ],
        },
      ],
    },
    moderation: {
      title: "Politica de Moderacion",
      description:
        "Como deben funcionar reportes, enforcement, apelaciones y seguridad operativa.",
      updated,
      sections: [
        {
          title: "Reportes Privados",
          body: [
            "Los reportes son silenciosos y privados por diseno. El producto no debe exponer contadores publicos de acusaciones.",
            "Moderadores revisan posts, comentarios, cursos, Project Signals y uploads reportados con contexto y auditoria.",
          ],
        },
        {
          title: "Acciones",
          body: [
            "Las acciones incluyen no actuar, restaurar, ocultar, advertir, restringir temporalmente, suspender y banear a medida que madure el admin tooling.",
            "URLs, uploads y contenido ejecutable de alto riesgo deben tener revision mas estricta antes de distribuirse ampliamente.",
          ],
        },
        {
          title: "Apelaciones",
          body: [
            "Debe configurarse un email final de apelaciones antes del lanzamiento publico.",
            "Cuando sea posible, las apelaciones deberian revisarse por alguien distinto del moderador original.",
          ],
        },
      ],
    },
  },
};

export function getLegalPage(locale: Locale, key: LegalPageKey) {
  return legalPages[locale][key];
}

export const legalNav: { key: LegalPageKey; href: string }[] = [
  { key: "terms", href: "/legal/terms" },
  { key: "privacy", href: "/legal/privacy" },
  { key: "code-of-conduct", href: "/legal/code-of-conduct" },
  { key: "moderation", href: "/legal/moderation" },
];
