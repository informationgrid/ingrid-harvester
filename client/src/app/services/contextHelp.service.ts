import {Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {DialogPosition, MatDialog, MatDialogRef} from "@angular/material/dialog";
import {ContextHelpComponent} from "../shared/context-help/context-help/context-help.component";

@Injectable({
  providedIn: 'root'
})
export class ContextHelpService {
  private currentDialog: MatDialogRef<ContextHelpComponent, any>;

  private static contextDialogHeight = 400;
  private static contextDialogMaxHeight = 600;
  private static contextDialogWidth = 500;
  private static contextDialogMaxWidth = 800;

  private static getLeftPosition(infoElement: HTMLElement) {
    const leftPosition =
      window.innerWidth - infoElement.getBoundingClientRect().left;
    const enoughSpaceBeneath = leftPosition > this.contextDialogWidth;

    return enoughSpaceBeneath
      ? `${infoElement.getBoundingClientRect().left}px`
      : `${
        infoElement.getBoundingClientRect().left - this.contextDialogWidth
      }px`;
  }

  private static getTopPosition(infoElement: HTMLElement) {
    const topPosition =
      window.innerHeight - infoElement.getBoundingClientRect().top;
    const enoughSpaceBeneath = topPosition > this.contextDialogHeight;
    const altTop =
      infoElement.getBoundingClientRect().top - this.contextDialogHeight;
    const enoughSpaceAbove = altTop > 0;

    return !enoughSpaceBeneath && enoughSpaceAbove
      ? `${altTop}px`
      : `${infoElement.getBoundingClientRect().top}px`;
  }

  constructor(
    public dialog: MatDialog,
    private http: HttpClient,
  ) {
  }

  show(markdownFileName: string) {
    const locale = 'de',
        profile = "ingrid";

    this.http.get<{
      title: string,
      id: string,
      profile: string,
      htmlContent: string
    }>(`/rest/api/help/${locale}/${profile}/${markdownFileName}`).subscribe( response => {
      const helpText = response.htmlContent
      this.showContextHelpPopup(response.title, helpText)
    });
  }

  public showContextHelpPopup(
    label: string,
    helpText: string,
    infoElement?: HTMLElement,
  ) {
    let dialogPosition: DialogPosition = infoElement
      ? {
        left: ContextHelpService.getLeftPosition(infoElement),
        top: ContextHelpService.getTopPosition(infoElement),
      }
      : null;

    // If any position is under 0 meaning outside the window,
    // the dialog will be centered for accessibility.
    if (
      parseInt(dialogPosition?.left) < 0 ||
      parseInt(dialogPosition?.top) < 0
    ) {
      dialogPosition = null;
    }

    this.currentDialog?.close();

    this.currentDialog = this.dialog.open(ContextHelpComponent, {
      data: {
        title: label,
        description: helpText,
      },
      backdropClass: "cdk-overlay-transparent-backdrop",
      hasBackdrop: false,
      closeOnNavigation: true,
      position: dialogPosition,
    });
  }
}
