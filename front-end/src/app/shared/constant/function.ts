
import Swal, {SweetAlertResult} from "sweetalert2";
import {environment} from '../../../environments/environment';

export function showAlert(data: any): Promise<SweetAlertResult> {
  const classIcon = data.classIcon || ''
  return Swal.fire({
    icon: data?.icon || '',
    title: data.title || '',
    html: `<div style="text-align: justify; color: #ffff !important; font-family: Fredoka, sans-serif !important; font-size: 18px;">${data.html}</div>`,
    confirmButtonText: data.confirmButtonText || 'Confirmer',
    cancelButtonText: data.cancelButtonText || 'Annuler',
    cancelButtonColor: data.cancelButtonColor || 'red',
    background: data.background || 'linear-gradient(180deg, rgba(18, 24, 38, .96), rgba(15, 20, 32, .96))',
    width: data.width || '500',
    showCancelButton: data.showCancelButton || false,
    showConfirmButton: data.showConfirmButton || true,
    confirmButtonColor: data.confirmButtonColor || '#2b76a3',
    showLoaderOnConfirm: data?.showLoaderOnConfirm,
    showLoaderOnDeny: data?.showLoaderOnDeny,
    preConfirm: data?.preConfirm,
    customClass: {
      container: "custom-swal-container-class",
      icon: classIcon
    },
    showDenyButton: data?.showDenyButton || false,
    denyButtonText: data?.denyButtonText || '',
    denyButtonColor: data?.denyButtonColor || '',
    allowOutsideClick: data?.allowOutsideClick || false,
    input: data?.input,
    inputOptions: data?.inputOptions,
    inputPlaceholder: data?.inputPlaceholder,
    toast: data?.toast || false,
  });
}

const API_BASE = (environment.api_Url || 'https://4tek.tn/v1').replace(/\/+$/, '');

export function getUrl(url?: string): string {
  if (!url) return '';

  // keep data: images untouched
  if (typeof url === 'string' && url.startsWith('data:')) return url;

  // If already absolute (http/https), just return it
  try {
    const abs = new URL(url as string);
    return abs.href;
  } catch {
    // not an absolute URL -> treat as relative
  }

  // Ensure leading slash on the relative path
  let rel = url.startsWith('/') ? url : `/${url}`;

  // If the relative already contains /v1 at the start, drop it (API_BASE already has it in prod)
  if (rel.startsWith('/v1/')) rel = rel.slice(3); // remove "/v1"

  return `${API_BASE}${rel}`;
}

