import { permanentRedirect } from "next/navigation";

/** `/en/start-here`: ver `/empieza-aqui`. */
export default function StartHereEn() {
  permanentRedirect("/en");
}
