Name:                       ingrid-harvester
Version:                    0.0.0
Release:                    dev
Summary:                    InGrid Harvester
Group:                      Applications/Internet
License:                    Proprietary
URL:                        https://www.wemove.com/
BuildArch:                  noarch
AutoReqProv:                no

%define install_root        /opt/ingrid/ingrid-harvester
%define target              %{buildroot}%{install_root}
%define systemd_dir         /usr/lib/systemd/system
%define ingrid_unit_name    ingrid-harvester.service
%define ingrid_service      %{systemd_dir}/%{ingrid_unit_name}

%description
InGrid API

%prep

%build
# nothing to do

%install
rm -Rf %{buildroot}*

mkdir -p %{target}
ls -al ${WORKSPACE}/build
cp -r ${WORKSPACE}/build/* %{target}
ls -al %{target}

# Copy over the systemd unit file
mkdir -p %{buildroot}%{systemd_dir}
cp ${WORKSPACE}/rpm/%{ingrid_unit_name} %{buildroot}%{systemd_dir}

%files
%defattr(0644,ingrid,ingrid,0755)
%attr(0755,ingrid,ingrid) %{install_root}
%attr(0644,root,root) %{ingrid_service}
%config(noreplace) %{install_root}/config.json

################################################################################
%pre
# Scriptlet that is executed just before the package is installed on the target
# system.
if [ -f "/etc/systemd/system/ingrid-harvester.service" ]; then
  service ingrid-harvester stop
fi

################################################################################
%preun
if [ -f "/etc/systemd/system/ingrid-harvester.service" ]; then
  service ingrid-harvester stop
fi

################################################################################
%postun


%changelog
